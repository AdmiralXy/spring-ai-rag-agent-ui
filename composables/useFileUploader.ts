import { computed, ref, shallowRef } from 'vue'
import useNotification from '~/composables/useNotification'
import { NotificationType } from '~/types/notification'
import { readAsDataUrl, splitFileName, type UploadItem } from '~/utils/fileUpload'
import {
  UPLOAD_CRYPTO_VERSION,
  assertSupportedEncryption,
  deriveMasterKey,
  deriveSessionKey,
  fromBase64,
  randomKeySalt,
  sealChunk,
  sealManifest,
  toBase64,
  uploadProof
} from '~/utils/uploadCrypto'

const PARALLEL_REQUESTS = 4
const REQUEST_RETRIES = 3
const RETRY_BASE_DELAY_MS = 500
const MAX_ARCHIVE_NAME = 255
/** Chunks up to this size are sent in batches (POST /chunks), bigger ones as single PUTs. */
const BATCH_ITEM_MAX = 1024 * 1024
const BATCH_ITEM_JSON_OVERHEAD = 128
const BATCH_BODY_RESERVE = 64 * 1024
const GCM_TAG_LENGTH = 16

/**
 * Asks the user for the upload key. Resolves with the password, or null if the user cancelled.
 * The caller must not keep the password: it is only used to derive a non-extractable key.
 */
export type AskUploadKey = (opts: { error?: string }) => Promise<string | null>

/** A top-level folder is uploaded as one encrypted ZIP archive through a chunked upload session. */
interface ArchiveJob {
  kind: 'archive'
  name: string
  items: UploadItem[]
  /** Set while a session exists on the server; lets a retry resume instead of starting over. */
  uploadId?: string
}

/** A loose file is uploaded as a regular file with a single request (not encrypted). */
interface FileJob {
  kind: 'file'
  item: UploadItem
}

type UploadJob = ArchiveJob | FileJob

interface ChunkJob {
  fileIndex: number
  chunkIndex: number
  size: number
}

interface PlannedRequest {
  kind: 'single' | 'batch'
  chunks: ChunkJob[]
}

interface HttpError {
  status?: number
  data?: { detail?: string; message?: string }
  message?: string
  name?: string
}

class UploadAbortedError extends Error {
  constructor() {
    super('Upload cancelled')
    this.name = 'AbortError'
  }
}

/** The user closed the key dialog. */
class UploadKeyCancelledError extends Error {
  constructor() {
    super('Upload key is required')
    this.name = 'UploadKeyCancelledError'
  }
}

function jobBytes(job: UploadJob) {
  return job.kind === 'file'
    ? job.item.file.size
    : job.items.reduce((sum, item) => sum + item.file.size, 0)
}

function jobLabel(job: UploadJob) {
  return job.kind === 'file' ? job.item.file.name : `${job.name}.zip`
}

/** Loose files go one by one; each top-level folder becomes its own archive. */
function buildJobs(items: UploadItem[]): UploadJob[] {
  const jobs: UploadJob[] = []
  const archives = new Map<string, ArchiveJob>()

  for (const item of items) {
    const slash = item.path.indexOf('/')
    if (slash < 0) {
      jobs.push({ kind: 'file', item })
      continue
    }

    const folder = item.path.slice(0, slash)
    let archive = archives.get(folder)
    if (!archive) {
      archive = { kind: 'archive', name: folder.slice(0, MAX_ARCHIVE_NAME), items: [] }
      archives.set(folder, archive)
      jobs.push(archive)
    }
    archive.items.push(item)
  }

  return jobs
}

function chunkBytes(size: number, chunkSize: number, chunkIndex: number) {
  return Math.min(size, (chunkIndex + 1) * chunkSize) - chunkIndex * chunkSize
}

/** Small chunks are packed into batches within the body/count limits, big chunks go one per PUT. */
function planRequests(
  files: UploadSessionFileRs[],
  chunkSize: number,
  cfg: UploadConfigRs,
  received?: Map<number, Set<number>>
): PlannedRequest[] {
  const budget = cfg.maxRequestSize - BATCH_BODY_RESERVE
  const singles: PlannedRequest[] = []
  const batches: PlannedRequest[] = []
  let batch: ChunkJob[] = []
  let batchBytes = 0

  for (const file of files) {
    const got = received?.get(file.index)
    for (let c = 0; c < file.chunkCount; c++) {
      if (got?.has(c)) continue
      const job: ChunkJob = {
        fileIndex: file.index,
        chunkIndex: c,
        size: chunkBytes(file.size, chunkSize, c)
      }
      if (job.size > BATCH_ITEM_MAX) {
        singles.push({ kind: 'single', chunks: [job] })
        continue
      }
      const cost = 4 * Math.ceil((job.size + GCM_TAG_LENGTH) / 3) + BATCH_ITEM_JSON_OVERHEAD
      if (batch.length && (batchBytes + cost > budget || batch.length >= cfg.maxBatchChunks)) {
        batches.push({ kind: 'batch', chunks: batch })
        batch = []
        batchBytes = 0
      }
      batch.push(job)
      batchBytes += cost
    }
  }
  if (batch.length) batches.push({ kind: 'batch', chunks: batch })

  return [...singles, ...batches]
}

function statusOf(err: unknown) {
  return (err as HttpError)?.status
}

function isAbort(err: unknown) {
  return (err as HttpError)?.name === 'AbortError'
}

function isRetryable(err: unknown) {
  const status = statusOf(err)
  return status === undefined || status === 408 || status === 429 || status >= 500
}

function errorMessage(err: unknown) {
  const e = err as HttpError
  return e?.data?.detail || e?.data?.message || e?.message || 'Something went wrong'
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new UploadAbortedError())
      },
      { once: true }
    )
  })
}

/** Checks the limits from /config before anything is sent; returns an error text or null. */
function validateLimits(jobs: UploadJob[], cfg: UploadConfigRs) {
  for (const job of jobs) {
    if (job.kind !== 'archive') continue
    if (job.items.length > cfg.maxFiles) {
      return `${job.name}: ${job.items.length} files, the limit is ${cfg.maxFiles}`
    }
    if (jobBytes(job) > cfg.maxTotalSize) {
      return `${job.name}: folder is larger than ${Math.floor(cfg.maxTotalSize / 1024 / 1024)} MB`
    }
  }
  return null
}

export function useFileUploader(askKey: AskUploadKey) {
  const config = useRuntimeConfig()
  const http = $fetch.create({ baseURL: config.public.apiBase as string })
  const { notify } = useNotification()

  const uploading = ref(false)
  const preparingKey = ref(false)
  const loadedBytes = ref(0)
  const totalBytes = ref(0)
  const currentLabel = ref('')
  /** Jobs that failed or were not reached; `retry()` continues them. */
  const pendingJobs = shallowRef<UploadJob[]>([])
  let controller: AbortController | null = null

  const progress = computed(() =>
    totalBytes.value ? Math.min(100, Math.round((loadedBytes.value / totalBytes.value) * 100)) : 0
  )

  async function withRetries<T>(signal: AbortSignal, fn: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await fn()
      } catch (err) {
        if (signal.aborted || isAbort(err)) throw new UploadAbortedError()
        if (!isRetryable(err) || attempt >= REQUEST_RETRIES) throw err
        await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), signal)
      }
    }
  }

  /** Asks for the password and turns it into a non-extractable master key; the password is dropped here. */
  async function obtainMasterKey(cfg: UploadConfigRs, error?: string) {
    const password = await askKey({ error })
    if (!password) throw new UploadKeyCancelledError()
    preparingKey.value = true
    try {
      return await deriveMasterKey(password, cfg.encryption)
    } finally {
      preparingKey.value = false
    }
  }

  async function uploadFileJob(job: FileJob, signal: AbortSignal) {
    const { name, extension } = splitFileName(job.item.file.name)
    const body: UploadFileRq = { name, extension, content: await readAsDataUrl(job.item.file) }
    await http<FileRs>('/files', { method: 'POST', body, signal })
    loadedBytes.value += job.item.file.size
  }

  /** Resumes the job's session if it still exists, otherwise creates a new encrypted one. */
  async function prepareSession(
    job: ArchiveJob,
    cfg: UploadConfigRs,
    masterKey: CryptoKey,
    sessionKeys: Map<ArchiveJob, CryptoKey>,
    signal: AbortSignal
  ) {
    if (job.uploadId) {
      try {
        const status = await http<UploadStatusRs>(`/files/uploads/${job.uploadId}`, { signal })
        const key = await deriveSessionKey(masterKey, fromBase64(status.keySalt), cfg.encryption)
        sessionKeys.set(job, key)

        const received = new Map<number, Set<number>>()
        for (const file of status.files) {
          received.set(file.index, new Set(file.receivedChunks))
          for (const c of file.receivedChunks) {
            loadedBytes.value += chunkBytes(file.size, status.chunkSize, c)
          }
        }
        return {
          uploadId: job.uploadId,
          key,
          plan: planRequests(status.files, status.chunkSize, cfg, received),
          chunkSize: status.chunkSize
        }
      } catch (err) {
        const status = statusOf(err)
        // 404/410: the session is gone or expired and cannot be resumed, start over
        if (status !== 404 && status !== 410) throw err
        job.uploadId = undefined
        sessionKeys.delete(job)
      }
    }

    const keySalt = randomKeySalt(cfg.encryption)
    const key = await deriveSessionKey(masterKey, keySalt, cfg.encryption)
    const manifest: UploadManifest = {
      name: job.name,
      files: job.items.map((item) => ({ path: item.path, size: item.file.size }))
    }
    const body: CreateUploadRq = {
      version: UPLOAD_CRYPTO_VERSION,
      keySalt: toBase64(keySalt),
      ...(await sealManifest(key, manifest))
    }
    // not retried: a 401 here means a wrong upload key
    const session = await http<CreateUploadRs>('/files/uploads', { method: 'POST', body, signal })
    job.uploadId = session.uploadId
    sessionKeys.set(job, key)

    return {
      uploadId: session.uploadId,
      key,
      plan: planRequests(session.files, session.chunkSize, cfg),
      chunkSize: session.chunkSize
    }
  }

  async function uploadArchiveJob(
    job: ArchiveJob,
    cfg: UploadConfigRs,
    masterKey: CryptoKey,
    sessionKeys: Map<ArchiveJob, CryptoKey>,
    signal: AbortSignal
  ) {
    const { uploadId, key, plan, chunkSize } = await prepareSession(
      job,
      cfg,
      masterKey,
      sessionKeys,
      signal
    )

    // encrypted lazily right before sending, so at most PARALLEL_REQUESTS bodies are in memory
    const encrypt = async (chunk: ChunkJob) => {
      const from = chunk.chunkIndex * chunkSize
      const file = job.items[chunk.fileIndex]!.file
      const bytes = new Uint8Array(await file.slice(from, from + chunk.size).arrayBuffer())
      return sealChunk(key, uploadId, chunk.fileIndex, chunk.chunkIndex, bytes)
    }

    const send = async (request: PlannedRequest) => {
      if (request.kind === 'single') {
        const chunk = request.chunks[0]!
        const body: UploadChunkRq = await encrypt(chunk)
        await withRetries(signal, () =>
          http(`/files/uploads/${uploadId}/files/${chunk.fileIndex}/chunks/${chunk.chunkIndex}`, {
            method: 'PUT',
            body,
            signal
          })
        )
      } else {
        const chunks: UploadChunkItemRq[] = []
        for (const chunk of request.chunks) {
          chunks.push({
            fileIndex: chunk.fileIndex,
            chunkIndex: chunk.chunkIndex,
            ...(await encrypt(chunk))
          })
        }
        const body: UploadChunksRq = { chunks }
        await withRetries(signal, () =>
          http(`/files/uploads/${uploadId}/chunks`, { method: 'POST', body, signal })
        )
      }
      loadedBytes.value += request.chunks.reduce((sum, chunk) => sum + chunk.size, 0)
    }

    let next = 0
    let failed = false
    const worker = async () => {
      while (!failed && next < plan.length) {
        try {
          await send(plan[next++]!)
        } catch (err) {
          failed = true
          throw err
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL_REQUESTS, plan.length) }, () => worker())
    )

    await http<FileRs>(`/files/uploads/${uploadId}/complete`, {
      method: 'POST',
      headers: { 'X-Upload-Proof': await uploadProof(key, 'complete', uploadId) },
      signal
    })
    job.uploadId = undefined
    sessionKeys.delete(job)
  }

  /** Cancels server sessions we hold a key for; others expire on the server by TTL. */
  async function cancelSessions(jobs: UploadJob[], sessionKeys: Map<ArchiveJob, CryptoKey>) {
    await Promise.allSettled(
      jobs.map(async (job) => {
        if (job.kind !== 'archive' || !job.uploadId) return
        const key = sessionKeys.get(job)
        if (!key) return
        await http(`/files/uploads/${job.uploadId}`, {
          method: 'DELETE',
          headers: { 'X-Upload-Proof': await uploadProof(key, 'cancel', job.uploadId) }
        })
        job.uploadId = undefined
      })
    )
  }

  /** Runs the jobs one by one. Returns how many succeeded; failed and unreached jobs stay pending. */
  async function run(jobs: UploadJob[]) {
    if (uploading.value || !jobs.length) return 0

    controller = new AbortController()
    const { signal } = controller
    uploading.value = true
    loadedBytes.value = 0
    totalBytes.value = jobs.reduce((sum, job) => sum + jobBytes(job), 0)

    // keys live only for this run: released (garbage collected) when it returns
    let masterKey: CryptoKey | null = null
    const sessionKeys = new Map<ArchiveJob, CryptoKey>()
    const remaining = [...jobs]
    let succeeded = 0
    let failedLabel = 'Upload'

    try {
      let cfg: UploadConfigRs | null = null
      if (jobs.some((job) => job.kind === 'archive')) {
        currentLabel.value = 'Checking limits…'
        cfg = await http<UploadConfigRs>('/files/uploads/config', { signal })
        assertSupportedEncryption(cfg.encryption)
        const limitError = validateLimits(jobs, cfg)
        if (limitError) {
          notify({ type: NotificationType.ERROR, message: limitError })
          pendingJobs.value = []
          return 0
        }
        currentLabel.value = 'Checking upload key…'
        masterKey = await obtainMasterKey(cfg)
      }

      while (remaining.length) {
        const job = remaining[0]!
        failedLabel = jobLabel(job)
        currentLabel.value = `Uploading ${jobLabel(job)}`
        const before = loadedBytes.value
        for (;;) {
          try {
            if (job.kind === 'file') await uploadFileJob(job, signal)
            else await uploadArchiveJob(job, cfg!, masterKey!, sessionKeys, signal)
            break
          } catch (err) {
            // keep the overall bar consistent: a retry recounts this job from the server state
            loadedBytes.value = before
            if (job.kind === 'archive' && statusOf(err) === 401) {
              currentLabel.value = 'Checking upload key…'
              masterKey = await obtainMasterKey(cfg!, 'Wrong upload key, try again')
              currentLabel.value = `Uploading ${jobLabel(job)}`
              continue
            }
            throw err
          }
        }
        remaining.shift()
        succeeded++
      }
      pendingJobs.value = []
    } catch (err) {
      if (signal.aborted || isAbort(err)) {
        await cancelSessions(remaining, sessionKeys)
        pendingJobs.value = []
        notify({ type: NotificationType.WARNING, message: 'Upload cancelled' })
      } else if (err instanceof UploadKeyCancelledError) {
        // nothing sent yet: just stop; otherwise keep the rest for a later resume
        pendingJobs.value =
          succeeded || remaining.some((j) => j.kind === 'archive' && j.uploadId) ? remaining : []
      } else {
        pendingJobs.value = remaining
        notify({
          type: NotificationType.ERROR,
          message: `${failedLabel}: ${errorMessage(err)}`
        })
      }
    } finally {
      uploading.value = false
      preparingKey.value = false
      currentLabel.value = ''
      controller = null
      masterKey = null
      sessionKeys.clear()
    }

    if (succeeded && !pendingJobs.value.length) {
      notify({
        type: NotificationType.INFO,
        message: succeeded === 1 ? 'Upload complete' : `${succeeded} items uploaded`
      })
    }
    return succeeded
  }

  function start(items: UploadItem[]) {
    return run(buildJobs(items))
  }

  /** Continues pending jobs; archives ask for the upload key again and send only missing chunks. */
  function retry() {
    return run(pendingJobs.value)
  }

  function cancel() {
    controller?.abort()
  }

  /**
   * Drops pending jobs. Their server sessions cannot be cancelled without the key
   * (it is released after each run), so they expire on the server by TTL.
   */
  function discard() {
    pendingJobs.value = []
  }

  return {
    uploading,
    preparingKey,
    progress,
    loadedBytes,
    totalBytes,
    currentLabel,
    hasPending: computed(() => pendingJobs.value.length > 0),
    start,
    retry,
    cancel,
    discard
  }
}
