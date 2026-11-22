<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useConfirmDialog } from '~/composables/useConfirmDialog'
import { useFileUploader } from '~/composables/useFileUploader'
import { formatSize, type UploadItem } from '~/utils/fileUpload'
import FilesDropzone from '~/components/files/FilesDropzone.vue'
import UploadKeyDialog from '~/components/files/UploadKeyDialog.vue'

const { confirm } = useConfirmDialog()
const auth = useAuthStore()
const filesStore = useFilesStore()
const { files, loading, page, size, totalElements, totalPages } = storeToRefs(filesStore)

// key dialog: the uploader awaits askUploadKey(); the password is passed through, never stored
const keyDialogOpen = ref(false)
const keyDialogError = ref<string | undefined>()
let resolveKey: ((password: string | null) => void) | null = null

function askUploadKey({ error }: { error?: string }) {
  keyDialogError.value = error
  keyDialogOpen.value = true
  return new Promise<string | null>((resolve) => {
    resolveKey = resolve
  })
}

function settleKey(password: string | null) {
  keyDialogOpen.value = false
  resolveKey?.(password)
  resolveKey = null
}

const uploader = useFileUploader(askUploadKey)
const { uploading, preparingKey, progress, loadedBytes, totalBytes, currentLabel, hasPending } =
  uploader

const uploadOpen = ref(false)
const selectedItems = ref<UploadItem[]>([])
const downloadingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)

await useAsyncData('files-page', async () => {
  await filesStore.fetchFiles(0)
  return filesStore.files
})

// UPagination is 1-based, the API is 0-based
const currentPage = computed({
  get: () => page.value + 1,
  set: (value: number) => {
    void filesStore.fetchFiles(value - 1)
  }
})

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
})

function extLabel(extension?: string) {
  return (extension || 'file').split('.').pop()!.slice(0, 4)
}

function formatDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateFormatter.format(date)
}

function toggleUpload() {
  if (uploading.value) return
  if (hasPending.value) uploader.discard()
  uploadOpen.value = !uploadOpen.value
  selectedItems.value = []
}

async function afterUpload(succeeded: number) {
  // new files are sorted first, so show the first page
  if (succeeded) await filesStore.fetchFiles(0)
  if (!hasPending.value) {
    selectedItems.value = []
    if (succeeded) uploadOpen.value = false
  }
}

async function upload() {
  if (!selectedItems.value.length) return
  await afterUpload(await uploader.start(selectedItems.value))
}

async function retryUpload() {
  await afterUpload(await uploader.retry())
}

function discardUpload() {
  uploader.discard()
  selectedItems.value = []
}

// stop a running upload when navigating away; a running upload still holds the key, so its session is cancelled
onBeforeUnmount(() => {
  settleKey(null)
  uploader.cancel()
  uploader.discard()
})

async function download(file: FileRs) {
  downloadingId.value = file.id
  try {
    await filesStore.downloadFile(file)
  } catch {
    // handled by useApi
  } finally {
    downloadingId.value = null
  }
}

async function remove(file: FileRs) {
  const ok = await confirm('Remove file', `"${file.fileName}" will be deleted permanently.`)
  if (!ok) return

  deletingId.value = file.id
  try {
    await filesStore.deleteFile(file.id)
  } catch {
    // handled by useApi
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <LayoutWrapper title="Files" subtitle="Encrypted file storage">
    <template #header-actions>
      <button
        type="button"
        class="ui-btn"
        :class="uploadOpen ? 'ui-btn--secondary' : 'ui-btn--primary'"
        :disabled="uploading"
        @click="toggleUpload"
      >
        <Icon :name="uploadOpen ? 'lucide:x' : 'lucide:upload'" />
        {{ uploadOpen ? 'Cancel' : 'Upload' }}
      </button>
    </template>

    <div v-if="uploadOpen" class="ui-card files__upload">
      <p v-if="!auth.user?.uploadKeySet" class="files__notice" role="status">
        <Icon name="lucide:shield-alert" class="flex-none" />
        <span>
          Folders are encrypted with your upload password, which is not set yet.
          <NuxtLink to="/account" class="files__notice-link">Set it in Account</NuxtLink>
          to upload folders; single files work without it.
        </span>
      </p>
      <FilesDropzone v-model="selectedItems" :disabled="uploading || hasPending" />

      <div v-if="uploading || hasPending" class="files__progress">
        <div class="files__progress-head">
          <span class="files__progress-label">
            <Icon
              v-if="preparingKey"
              name="lucide:loader-circle"
              class="mr-1 animate-spin align-[-2px]"
            />
            {{ uploading ? currentLabel : 'Upload interrupted. Resume continues where it stopped' }}
          </span>
          <span class="files__progress-value">
            {{ formatSize(loadedBytes) }} / {{ formatSize(totalBytes) }} · {{ progress }}%
          </span>
        </div>
        <div class="files__progress-track">
          <div
            class="files__progress-bar"
            :class="{ 'files__progress-bar--failed': !uploading }"
            :style="{ width: `${progress}%` }"
          />
        </div>
      </div>

      <div class="files__upload-actions">
        <template v-if="uploading">
          <button type="button" class="ui-btn ui-btn--secondary" @click="uploader.cancel()">
            Stop
          </button>
        </template>
        <template v-else-if="hasPending">
          <button type="button" class="ui-btn ui-btn--primary" @click="retryUpload">Resume</button>
          <button type="button" class="ui-btn ui-btn--secondary" @click="discardUpload">
            Discard
          </button>
        </template>
        <template v-else>
          <button
            type="button"
            class="ui-btn ui-btn--primary"
            :disabled="!selectedItems.length"
            @click="upload"
          >
            Upload {{ selectedItems.length ? `${selectedItems.length} files` : '' }}
          </button>
        </template>
      </div>
    </div>

    <div v-if="loading && !files.length" class="ui-group">
      <div v-for="n in 4" :key="n" class="ui-group-row files__row">
        <USkeleton class="h-9 w-9 rounded-[9px]" />
        <USkeleton class="h-4 w-56 rounded" />
      </div>
    </div>

    <div v-else-if="!files.length" class="ui-empty">
      <Icon name="lucide:folder-open" class="ui-empty__icon" />
      <p class="ui-empty__title">No files yet</p>
      <p class="text-sm">Uploaded files are encrypted with your upload key.</p>
    </div>

    <template v-else>
      <div class="ui-group" :class="{ 'files__list--loading': loading }">
        <div v-for="file in files" :key="file.id" class="ui-group-row files__row">
          <span class="files__ext" :title="file.extension">{{ extLabel(file.extension) }}</span>
          <div class="files__meta">
            <span class="files__name" :title="file.fileName">{{ file.fileName }}</span>
            <span class="files__details">
              {{ formatSize(file.size) }} · {{ formatDate(file.createdAt) }}
            </span>
          </div>
          <button
            type="button"
            class="ui-icon-btn"
            :aria-label="`Download ${file.fileName}`"
            title="Download"
            :disabled="downloadingId === file.id"
            @click="download(file)"
          >
            <Icon
              :name="downloadingId === file.id ? 'lucide:loader-circle' : 'lucide:download'"
              :class="{ 'animate-spin': downloadingId === file.id }"
            />
          </button>
          <button
            type="button"
            class="ui-icon-btn ui-icon-btn--danger"
            :aria-label="`Delete ${file.fileName}`"
            title="Delete"
            :disabled="deletingId === file.id"
            @click="remove(file)"
          >
            <Icon name="lucide:trash-2" />
          </button>
        </div>
      </div>

      <div v-if="totalPages > 1" class="files__pagination">
        <UPagination
          v-model:page="currentPage"
          :total="totalElements"
          :items-per-page="size"
          :disabled="loading"
          variant="ghost"
          active-variant="soft"
        />
      </div>
    </template>

    <UploadKeyDialog
      :open="keyDialogOpen"
      :error="keyDialogError"
      @submit="settleKey"
      @cancel="settleKey(null)"
    />
  </LayoutWrapper>
</template>

<style scoped>
@import 'tailwindcss/theme';

.files__notice {
  @apply m-0 flex items-start gap-2 rounded-[10px] px-3 py-2.5 text-[13px] leading-snug;
  background: rgba(255, 214, 10, 0.1);
  color: var(--c-warning);
}

.files__notice :deep(svg) {
  @apply mt-0.5;
}

.files__notice-link {
  @apply font-medium underline;
}

.files__upload {
  @apply flex flex-col gap-4 p-4;
}

.files__progress {
  @apply flex flex-col gap-1.5;
}

.files__progress-head {
  @apply flex items-center justify-between gap-3 text-xs;
}

.files__progress-label {
  @apply truncate;
  color: var(--c-text-2);
}

.files__progress-value {
  @apply shrink-0 tabular-nums;
  color: var(--c-text-4);
}

.files__progress-track {
  @apply h-1.5 overflow-hidden rounded-full;
  background: var(--c-surface-3);
}

.files__progress-bar {
  @apply h-full rounded-full transition-[width] duration-200;
  background: var(--c-accent);
}

.files__progress-bar--failed {
  background: var(--c-warning);
}

.files__upload-actions {
  @apply flex flex-wrap gap-2;
}

.files__list--loading {
  @apply pointer-events-none opacity-60 transition-opacity;
}

.files__row {
  @apply min-h-[60px] gap-3 pr-2;
}

.files__ext {
  @apply flex h-9 w-9 flex-none items-center justify-center rounded-[9px] text-[10px] font-semibold uppercase;
  background: var(--c-accent-soft);
  color: var(--c-accent-hover);
}

.files__meta {
  @apply flex min-w-0 flex-1 flex-col;
}

.files__name {
  @apply truncate text-sm font-medium;
  color: var(--c-text);
}

.files__details {
  @apply text-xs;
  color: var(--c-text-4);
}

.files__pagination {
  @apply flex justify-center;
}
</style>
