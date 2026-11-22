<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import useNotification from '~/composables/useNotification'
import { NotificationType } from '~/types/notification'
import {
  collectDroppedItems,
  collectInputItems,
  formatSize,
  type UploadItem
} from '~/utils/fileUpload'

const props = defineProps<{
  modelValue: UploadItem[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [items: UploadItem[]]
}>()

const { notify } = useNotification()
const filesInputRef = ref<HTMLInputElement | null>(null)
const folderInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const scanning = ref(false)

onMounted(() => {
  // not a typed attribute in Vue templates, so set it on the element
  if (folderInputRef.value) folderInputRef.value.webkitdirectory = true
})

/** Top-level entries of the selection: folders are grouped, loose files listed as is. */
const summary = computed(() => {
  const groups = new Map<string, { name: string; folder: boolean; count: number; size: number }>()
  for (const item of props.modelValue) {
    const slash = item.path.indexOf('/')
    const folder = slash >= 0
    const name = folder ? item.path.slice(0, slash) : item.path
    const key = `${folder ? 'd' : 'f'}:${name}`
    const group = groups.get(key) ?? { name, folder, count: 0, size: 0 }
    group.count++
    group.size += item.file.size
    groups.set(key, group)
  }
  return [...groups.values()]
})

function setItems(items: UploadItem[]) {
  if (!items.length) {
    notify({ type: NotificationType.WARNING, message: 'No files found in the selection' })
  }
  emit('update:modelValue', items)
}

function onInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  setItems(collectInputItems(input.files))
  input.value = ''
}

function onDragOver() {
  if (props.disabled) return
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

async function onDrop(event: DragEvent) {
  isDragging.value = false
  if (props.disabled || scanning.value) return

  // collectDroppedItems reads dataTransfer synchronously before its first await
  const pending = collectDroppedItems(event.dataTransfer)
  scanning.value = true
  try {
    setItems(await pending)
  } catch {
    notify({ type: NotificationType.ERROR, message: 'Could not read the dropped items' })
  } finally {
    scanning.value = false
  }
}

function openFiles() {
  if (props.disabled) return
  filesInputRef.value?.click()
}

function openFolder() {
  if (props.disabled) return
  folderInputRef.value?.click()
}

function clear() {
  emit('update:modelValue', [])
}
</script>

<template>
  <div class="files-dropzone">
    <input
      ref="filesInputRef"
      type="file"
      multiple
      class="files-dropzone__input"
      @change="onInputChange"
    />
    <input ref="folderInputRef" type="file" class="files-dropzone__input" @change="onInputChange" />

    <div
      class="files-dropzone__surface"
      :class="{
        'files-dropzone__surface--dragging': isDragging,
        'files-dropzone__surface--disabled': props.disabled
      }"
      @click="openFiles"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <div class="files-dropzone__icon">
        <Icon
          :name="scanning ? 'lucide:loader-circle' : 'lucide:upload'"
          :class="{ 'animate-spin': scanning }"
        />
      </div>
      <div class="files-dropzone__content">
        <p class="files-dropzone__title">
          {{ scanning ? 'Reading folders…' : 'Drop files or folders here' }}
        </p>
        <p class="files-dropzone__description">
          Each folder is uploaded as a ZIP archive.
          <button type="button" class="files-dropzone__link" @click.stop="openFiles">
            Choose files
          </button>
          or
          <button type="button" class="files-dropzone__link" @click.stop="openFolder">
            choose a folder
          </button>
        </p>
      </div>
    </div>

    <div v-if="summary.length" class="files-dropzone__footer">
      <ul class="files-dropzone__chips">
        <li
          v-for="entry in summary"
          :key="`${entry.folder}:${entry.name}`"
          class="files-dropzone__chip"
        >
          <Icon :name="entry.folder ? 'lucide:folder-archive' : 'lucide:file'" />
          <span class="files-dropzone__chip-name">{{
            entry.folder ? `${entry.name}.zip` : entry.name
          }}</span>
          <span class="files-dropzone__chip-meta">
            {{ entry.folder ? `${entry.count} files · ` : '' }}{{ formatSize(entry.size) }}
          </span>
        </li>
      </ul>

      <button type="button" class="files-dropzone__clear" :disabled="props.disabled" @click="clear">
        Clear
      </button>
    </div>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.files-dropzone {
  @apply flex flex-col gap-3.5;
}

.files-dropzone__input {
  @apply hidden;
}

.files-dropzone__surface {
  @apply flex min-h-36 cursor-pointer items-center justify-center gap-4 p-6 transition-colors max-sm:flex-col max-sm:text-center;
  border-radius: var(--r-lg);
  border: 1.5px dashed var(--c-sep-strong);
  background: var(--c-surface-2);
}

.files-dropzone__surface:hover:not(.files-dropzone__surface--disabled),
.files-dropzone__surface--dragging {
  border-color: var(--c-accent-ring);
  background: rgba(10, 132, 255, 0.08);
}

.files-dropzone__surface--disabled {
  @apply cursor-not-allowed opacity-60;
}

.files-dropzone__icon {
  @apply inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-xl;
  background: var(--c-accent-soft);
  color: var(--c-accent-hover);
}

.files-dropzone__title {
  @apply text-[15px] font-semibold;
  color: var(--c-text);
}

.files-dropzone__description {
  @apply mt-1 text-sm;
  color: var(--c-text-3);
}

.files-dropzone__link {
  @apply cursor-pointer border-0 bg-transparent p-0 underline-offset-2 hover:underline;
  color: var(--c-accent);
}

.files-dropzone__footer {
  @apply flex flex-wrap items-center justify-between gap-3;
}

.files-dropzone__chips {
  @apply m-0 flex min-w-0 flex-1 list-none flex-wrap gap-1.5 p-0;
}

.files-dropzone__chip {
  @apply inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 text-xs;
  background: var(--c-surface-3);
  color: var(--c-text-2);
}

.files-dropzone__chip-name {
  @apply truncate;
}

.files-dropzone__chip-meta {
  @apply shrink-0;
  color: var(--c-text-4);
}

.files-dropzone__clear {
  @apply h-[30px] cursor-pointer rounded-full border-0 bg-transparent px-3 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50;
  color: var(--c-danger);
}

.files-dropzone__clear:hover:not(:disabled) {
  background: var(--c-danger-soft);
}
</style>
