/** A file picked for upload together with its path relative to the drop root (`/`-separated). */
export interface UploadItem {
  file: File
  path: string
}

export function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function splitFileName(fileName: string): { name: string; extension: string } {
  const dot = fileName.lastIndexOf('.')
  if (dot > 0 && dot < fileName.length - 1) {
    return { name: fileName.slice(0, dot), extension: fileName.slice(dot + 1) }
  }
  return { name: fileName, extension: 'bin' }
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
}

function readEntryFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject))
}

function readDirectoryBatch(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject))
}

async function walkEntry(entry: FileSystemEntry, prefix: string, out: UploadItem[]) {
  if (entry.isFile) {
    const file = await readEntryFile(entry as FileSystemFileEntry)
    out.push({ file, path: prefix + entry.name })
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    // readEntries returns results in batches (~100), read until an empty batch
    let batch: FileSystemEntry[]
    do {
      batch = await readDirectoryBatch(reader)
      for (const child of batch) await walkEntry(child, `${prefix}${entry.name}/`, out)
    } while (batch.length)
  }
}

/**
 * Collects files from a drop event, recursing into dropped folders.
 * Must be called synchronously inside the `drop` handler: the browser clears
 * `dataTransfer.items` after the first `await`, so entries are grabbed up front.
 */
export function collectDroppedItems(dataTransfer: DataTransfer | null): Promise<UploadItem[]> {
  if (!dataTransfer) return Promise.resolve([])

  const items = Array.from(dataTransfer.items ?? [])
  const entries = items
    .filter((item) => item.kind === 'file')
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => !!entry)

  if (!entries.length) {
    return Promise.resolve(
      Array.from(dataTransfer.files ?? []).map((file) => ({ file, path: file.name }))
    )
  }

  return (async () => {
    const out: UploadItem[] = []
    for (const entry of entries) await walkEntry(entry, '', out)
    return out
  })()
}

/** Converts an `<input type="file">` selection; folder inputs provide `webkitRelativePath`. */
export function collectInputItems(fileList: FileList | null): UploadItem[] {
  return Array.from(fileList ?? []).map((file) => ({
    file,
    path: file.webkitRelativePath || file.name
  }))
}
