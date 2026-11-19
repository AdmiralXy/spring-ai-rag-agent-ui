<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useConfirmDialog } from '~/composables/useConfirmDialog'
import useNotification from '~/composables/useNotification'
import { NotificationType } from '~/types/notification'
import SpaceFileDropzone from '~/components/spaces/SpaceFileDropzone.vue'

const { confirm } = useConfirmDialog()
const { notify } = useNotification()
const filesStore = useFilesStore()
const { files, loading, uploading, page, size, totalElements, totalPages } = storeToRefs(filesStore)

const uploadOpen = ref(false)
const selectedFiles = ref<File[]>([])
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

function formatDate(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateFormatter.format(date)
}

function formatSize(bytes: number) {
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

function toggleUpload() {
  uploadOpen.value = !uploadOpen.value
  selectedFiles.value = []
}

async function upload() {
  if (!selectedFiles.value.length) return
  const total = selectedFiles.value.length
  try {
    await filesStore.uploadFiles(selectedFiles.value)
    notify({
      type: NotificationType.INFO,
      message: total === 1 ? 'File uploaded' : `${total} files uploaded`
    })
    toggleUpload()
  } catch {
    // error notification is shown by useApi; keep the selection so the user can retry
  }
}

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
  <LayoutWrapper title="Files">
    <template #header-actions>
      <UButton color="primary" variant="solid" size="sm" @click="toggleUpload">
        <Icon
          :name="uploadOpen ? 'material-symbols:close' : 'material-symbols:upload'"
          class="mr-1"
        />
        {{ uploadOpen ? 'Cancel' : 'Upload' }}
      </UButton>
    </template>

    <div v-if="uploadOpen" class="files__upload">
      <SpaceFileDropzone v-model="selectedFiles" :disabled="uploading" />
      <div class="files__upload-actions">
        <UButton
          color="primary"
          variant="solid"
          size="sm"
          :loading="uploading"
          :disabled="!selectedFiles.length"
          @click="upload"
        >
          Upload {{ selectedFiles.length > 1 ? `${selectedFiles.length} files` : '' }}
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="uploading"
          @click="toggleUpload"
        >
          Cancel
        </UButton>
      </div>
    </div>

    <ul v-if="loading && !files.length" class="files__list">
      <li v-for="n in 3" :key="n" class="files__item">
        <USkeleton class="h-5 w-48 animate-pulse rounded bg-gray-700/50" />
        <USkeleton class="h-5 w-24 animate-pulse rounded bg-gray-700/50" />
      </li>
    </ul>

    <div v-else-if="!files.length" class="files__empty">No files yet.</div>

    <template v-else>
      <ul class="files__list" :class="{ 'files__list--loading': loading }">
        <li v-for="file in files" :key="file.id" class="files__item">
          <div class="files__info">
            <span class="files__ext">{{ file.extension }}</span>
            <div class="files__meta">
              <span class="files__name" :title="file.fileName">{{ file.fileName }}</span>
              <span class="files__details">
                {{ formatSize(file.size) }} · {{ formatDate(file.createdAt) }}
              </span>
            </div>
          </div>
          <div class="files__actions">
            <button
              class="files__action"
              title="Download"
              :disabled="downloadingId === file.id"
              @click="download(file)"
            >
              <Icon
                :name="
                  downloadingId === file.id
                    ? 'material-symbols:progress-activity'
                    : 'material-symbols:download'
                "
                :class="{ 'animate-spin': downloadingId === file.id }"
              />
            </button>
            <button
              class="files__action files__action--delete"
              title="Delete"
              :disabled="deletingId === file.id"
              @click="remove(file)"
            >
              <Icon name="material-symbols:delete-outline" />
            </button>
          </div>
        </li>
      </ul>

      <div v-if="totalPages > 1" class="files__pagination">
        <UPagination
          v-model:page="currentPage"
          :total="totalElements"
          :items-per-page="size"
          :disabled="loading"
        />
      </div>
    </template>
  </LayoutWrapper>
</template>

<style scoped>
@import 'tailwindcss/theme';

.files__upload {
  @apply mb-3 flex flex-col gap-3 rounded-lg border border-[#333] bg-[#1e1e1e] p-3;
}

.files__upload-actions {
  @apply flex flex-wrap gap-2;
}

.files__list {
  @apply flex flex-col gap-2 transition-opacity duration-200;
}

.files__list--loading {
  @apply pointer-events-none opacity-60;
}

.files__item {
  @apply flex items-center justify-between gap-3 rounded-md border border-[#333] bg-[#1e1e1e] p-3;
}

.files__info {
  @apply flex min-w-0 items-center gap-3;
}

.files__ext {
  @apply flex h-10 w-12 shrink-0 items-center justify-center rounded-md bg-blue-500/15 text-xs font-semibold text-blue-300 uppercase;
}

.files__meta {
  @apply flex min-w-0 flex-col;
}

.files__name {
  @apply truncate text-base text-gray-100;
}

.files__details {
  @apply text-xs text-gray-400;
}

.files__actions {
  @apply flex shrink-0 items-center gap-1;
}

.files__action {
  @apply cursor-pointer rounded-md border-none bg-transparent p-1 text-[1.2rem] text-gray-400 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50;
}

.files__action:hover:not(:disabled) {
  @apply text-white;
}

.files__action--delete:hover:not(:disabled) {
  @apply text-red-500;
}

.files__pagination {
  @apply mt-2 flex justify-center;
}

.files__empty {
  @apply rounded-lg border border-dashed border-[#3a3a3a] bg-[#1b1b1b] p-5 text-sm text-gray-400;
}
</style>
