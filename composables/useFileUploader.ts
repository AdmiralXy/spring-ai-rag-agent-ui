import { computed, ref, shallowRef } from 'vue'
import useNotification from '~/composables/useNotification'
import { NotificationType } from '~/types/notification'
import { readAsDataUrl, splitFileName, type UploadItem } from '~/utils/fileUpload'

const PARALLEL_CHUNKS = 4
const CHUNK_RETRIES = 3
const RETRY_BASE_DELAY_MS = 500
const MAX_ARCHIVE_NAME = 255

/** A top-level folder is uploaded as one ZIP archive through a chunked upload session. */
interface ArchiveJob {
  kind: 'archive'
  name: string
  items: UploadItem[]
  /** Set while a session exists on the server; lets a retry resume instead of starting over. */
  uploadId?: string
}

/** A loose file is uploaded as a regular file with a single request. */
interface FileJob {
  kind: 'file'
  item: UploadItem
}

type UploadJob = ArchiveJob | FileJob

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

function isAbort(err: unknown) {
  return (err as HttpError)?.name === 'AbortError'
}

function isRetryable(err: unknown) {
  const status = (err as HttpError)?.status
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

export function useFileUploader() {
  const config = useRuntimeConfig()
  const http = $fetch.create({ baseURL: config.public.apiBase as string })
  const { notify } = useNotification()

  const uploading = ref(false)
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
        if (!isRetryable(err) || attempt >= CHUNK_RETRIES) throw err
        await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), signal)
      }
    }
  }

  async function uploadFileJob(job: FileJob, signal: AbortSignal) {
    const { name, extension } = splitFileName(job.item.file.name)
    const body: UploadFileRq = { name, extension, content: await readAsDataUrl(job.item.file) }
    await http<FileRs>('/files', { method: 'POST', body, signal })
    loadedBytes.value += job.item.file.size
  }

  /** Returns the chunks still missing on the server, creating a session if there is none. */
  async function prepareSession(job: ArchiveJob, signal: AbortSignal) {
    if (job.uploadId) {
      try {
        const status = await http<UploadStatusRs>(`/files/uploads/${job.uploadId}`, { signal })
        const missing: { fileIndex: number; chunkIndex: number }[] = []
        for (const file of status.files) {
          const received = new Set(file.receivedChunks)
          for (let c = 0; c < file.chunkCount; c++) {
            if (received.has(c)) {
              loadedBytes.value += chunkBytes(file.size, status.chunkSize, c)
            } else {
              missing.push({ fileIndex: file.index, chunkIndex: c })
            }
          }
        }
        return { uploadId: job.uploadId, chunkSize: status.chunkSize, missing }
      } catch (err) {
        const status = (err as HttpError)?.status
        // 404/410: the session is gone or expired and cannot be resumed, start over
        if (status !== 404 && status !== 410) throw err
        job.uploadId = undefined
      }
    }

    const rq: CreateUploadRq = {
      name: job.name,
      files: job.items.map((item) => ({ path: item.path, size: item.file.size }))
    }
    const session = await http<CreateUploadRs>('/files/uploads', {
      method: 'POST',
      body: rq,
      signal
    })
    job.uploadId = session.uploadId

    const missing = session.files.flatMap((file) =>
      Array.from({ length: file.chunkCount }, (_, chunkIndex) => ({
        fileIndex: file.index,
        chunkIndex
      }))
    )
    return { uploadId: session.uploadId, chunkSize: session.chunkSize, missing }
  }

  function chunkBytes(size: number, chunkSize: number, chunkIndex: number) {
    return Math.min(size, (chunkIndex + 1) * chunkSize) - chunkIndex * chunkSize
  }

  async function uploadArchiveJob(job: ArchiveJob, signal: AbortSignal) {
    const { uploadId, chunkSize, missing } = await prepareSession(job, signal)

    let next = 0
    let failed = false
    const worker = async () => {
      while (!failed && next < missing.length) {
        const { fileIndex, chunkIndex } = missing[next++]!
        const file = job.items[fileIndex]!.file
        try {
          const blob = file.slice(chunkIndex * chunkSize, (chunkIndex + 1) * chunkSize)
          const body: UploadChunkRq = { content: await readAsDataUrl(blob) }
          await withRetries(signal, () =>
            http(`/files/uploads/${uploadId}/files/${fileIndex}/chunks/${chunkIndex}`, {
              method: 'PUT',
              body,
              signal
            })
          )
          loadedBytes.value += blob.size
        } catch (err) {
          failed = true
          throw err
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL_CHUNKS, missing.length) }, () => worker())
    )

    await http<FileRs>(`/files/uploads/${uploadId}/complete`, { method: 'POST', signal })
    job.uploadId = undefined
  }

  async function cancelSessions(jobs: UploadJob[]) {
    await Promise.allSettled(
      jobs
        .filter((job): job is ArchiveJob => job.kind === 'archive' && !!job.uploadId)
        .map((job) => http(`/files/uploads/${job.uploadId}`, { method: 'DELETE' }))
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

    const remaining = [...jobs]
    let succeeded = 0
    try {
      while (remaining.length) {
        const job = remaining[0]!
        currentLabel.value = jobLabel(job)
        const before = loadedBytes.value
        try {
          if (job.kind === 'file') await uploadFileJob(job, signal)
          else await uploadArchiveJob(job, signal)
        } catch (err) {
          // keep the overall bar consistent: a retry recounts this job from the server state
          loadedBytes.value = before
          throw err
        }
        remaining.shift()
        succeeded++
      }
      pendingJobs.value = []
    } catch (err) {
      if (signal.aborted || isAbort(err)) {
        await cancelSessions(remaining)
        pendingJobs.value = []
        notify({ type: NotificationType.WARNING, message: 'Upload cancelled' })
      } else {
        pendingJobs.value = remaining
        notify({
          type: NotificationType.ERROR,
          message: `${currentLabel.value}: ${errorMessage(err)}`
        })
      }
    } finally {
      uploading.value = false
      currentLabel.value = ''
      controller = null
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

  function retry() {
    return run(pendingJobs.value)
  }

  function cancel() {
    controller?.abort()
  }

  /** Drops pending jobs after a failure and removes their sessions on the server. */
  async function discard() {
    const jobs = pendingJobs.value
    pendingJobs.value = []
    await cancelSessions(jobs)
  }

  return {
    uploading,
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
