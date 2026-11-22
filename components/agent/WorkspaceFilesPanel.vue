<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { errorMessage, useApi } from '~/composables/useApi'
import { authHeaders } from '~/composables/useAuthToken'
import useNotification from '~/composables/useNotification'
import { NotificationType } from '~/types/notification'

const props = defineProps<{
  chatId: string
  /** Changes whenever the agent modified files */
  revision?: number
}>()

const emit = defineEmits<{ close: []; count: [value: number] }>()

const config = useRuntimeConfig()
const baseURL = config.public.apiBase as string

const listing = ref<WorkspaceListing>({ entries: [], truncated: false })
const loading = ref(false)
const downloading = ref<string | null>(null)
const { notify } = useNotification()

const fileCount = computed(() => listing.value.entries.filter((e) => e.type === 'file').length)
const archiveUrl = computed(() => `${baseURL}/chats/${props.chatId}/files/archive`)

function fileUrl(path: string) {
  return `${baseURL}/chats/${props.chatId}/files/content?path=${encodeURIComponent(path)}`
}

/** Downloads through fetch: the API needs the bearer token, which a plain link cannot send. */
async function download(url: string, fallbackName: string, key: string) {
  if (downloading.value) return
  downloading.value = key
  try {
    const response = await fetch(url, { headers: authHeaders() })
    if (!response.ok) throw new Error(`Download failed (${response.status})`)
    const disposition = response.headers.get('Content-Disposition') ?? ''
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
    const plain = /filename="?([^";]+)"?/i.exec(disposition)?.[1]
    const fileName = encoded ? decodeURIComponent(encoded) : plain || fallbackName
    const blobUrl = URL.createObjectURL(await response.blob())
    const link = Object.assign(document.createElement('a'), { href: blobUrl, download: fileName })
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(blobUrl), 0)
  } catch (err) {
    notify({ type: NotificationType.ERROR, message: errorMessage(err, 'Download failed') })
  } finally {
    downloading.value = null
  }
}

function depth(path: string) {
  return path.split('/').length - 1
}

function name(path: string) {
  return path.split('/').at(-1) ?? path
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null

async function refresh() {
  loading.value = true
  try {
    const api = useApi()
    listing.value = await api.get<WorkspaceListing>(`/chats/${props.chatId}/files`)
    emit('count', fileCount.value)
  } catch {
    listing.value = { entries: [], truncated: false }
  } finally {
    loading.value = false
  }
}

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(refresh, 400)
}

watch(() => props.revision, scheduleRefresh)
watch(() => props.chatId, refresh)
onMounted(refresh)
</script>

<template>
  <aside class="files" aria-label="Workspace files">
    <div class="files__head">
      <h2 class="files__title">Workspace</h2>
      <span class="ui-badge">{{ fileCount }}</span>
      <div class="flex-1"></div>
      <button
        type="button"
        class="ui-icon-btn"
        aria-label="Refresh"
        title="Refresh"
        :disabled="loading"
        @click="refresh"
      >
        <Icon name="lucide:refresh-cw" :class="{ 'animate-spin': loading }" />
      </button>
      <button
        type="button"
        class="ui-icon-btn"
        aria-label="Close files"
        title="Close"
        @click="emit('close')"
      >
        <Icon name="lucide:x" />
      </button>
    </div>

    <div v-if="!listing.entries.length" class="files__empty">
      <Icon name="lucide:folder-open" class="files__empty-icon" />
      <p>{{ loading ? 'Loading…' : 'Files the agent creates will appear here.' }}</p>
    </div>

    <ul v-else class="files__list">
      <li v-for="entry in listing.entries" :key="entry.path">
        <div
          v-if="entry.type === 'dir'"
          class="files__row files__row--dir"
          :style="{ paddingLeft: `${10 + depth(entry.path) * 16}px` }"
        >
          <Icon name="lucide:folder" class="files__icon files__icon--dir" />
          <span class="files__name">{{ name(entry.path) }}</span>
          <span v-if="entry.collapsed" class="files__meta">not listed</span>
        </div>
        <a
          v-else
          :href="fileUrl(entry.path)"
          class="files__row files__row--file"
          :style="{ paddingLeft: `${10 + depth(entry.path) * 16}px` }"
          :title="`Download ${entry.path}`"
          :aria-busy="downloading === entry.path"
          @click.prevent="download(fileUrl(entry.path), name(entry.path), entry.path)"
        >
          <Icon name="lucide:file" class="files__icon" />
          <span class="files__name">{{ name(entry.path) }}</span>
          <span class="files__meta">{{ formatSize(entry.size) }}</span>
          <Icon name="lucide:download" class="files__download" />
        </a>
      </li>
      <li v-if="listing.truncated" class="files__truncated">
        The list is truncated. Download the archive to get everything.
      </li>
    </ul>

    <div v-if="fileCount" class="files__footer">
      <a
        :href="archiveUrl"
        class="ui-btn ui-btn--secondary files__zip"
        @click.prevent="download(archiveUrl, 'workspace.zip', 'archive')"
      >
        <Icon
          :name="downloading === 'archive' ? 'lucide:loader-circle' : 'lucide:download'"
          :class="{ 'animate-spin': downloading === 'archive' }"
        />
        Download all as .zip
      </a>
    </div>
  </aside>
</template>

<style scoped>
@import 'tailwindcss/theme';

.files {
  @apply flex h-full w-full flex-col overflow-hidden md:w-[300px];
  background: var(--c-sidebar);
  border-left: 1px solid var(--c-sep);
}

.files__head {
  @apply flex h-[52px] flex-none items-center gap-2 pr-2.5 pl-4;
  border-bottom: 1px solid var(--c-sep);
}

.files__title {
  @apply m-0 text-sm font-semibold;
  color: var(--c-text);
}

.files__empty {
  @apply flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm;
  color: var(--c-text-4);
}

.files__empty-icon {
  @apply text-3xl;
}

.files__list {
  @apply m-0 flex flex-1 list-none flex-col gap-px overflow-y-auto p-2;
}

.files__row {
  @apply flex h-8 min-w-0 items-center gap-2 rounded-[8px] pr-2.5 text-[13px];
  color: var(--c-text-2);
}

.files__row--file:hover {
  background: var(--c-hover);
  color: var(--c-text);
}

.files__icon {
  @apply flex-none text-[15px];
  color: var(--c-text-3);
}

.files__icon--dir {
  color: var(--c-accent);
}

.files__name {
  @apply min-w-0 flex-1 truncate;
}

.files__meta {
  @apply flex-none text-[11px];
  color: var(--c-text-4);
}

.files__download {
  @apply hidden flex-none text-sm;
  color: var(--c-text-3);
}

.files__row--file:hover .files__meta {
  @apply hidden;
}

.files__row--file:hover .files__download {
  @apply block;
}

.files__truncated {
  @apply px-2.5 py-2 text-xs;
  color: var(--c-text-4);
}

.files__footer {
  @apply flex-none p-3;
  border-top: 1px solid var(--c-sep);
}

.files__zip {
  @apply w-full;
}
</style>
