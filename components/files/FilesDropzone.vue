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
          :name="
            scanning
              ? 'material-symbols:progress-activity'
              : 'material-symbols:upload-file-outline-rounded'
          "
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
          <Icon
            :name="
              entry.folder
                ? 'material-symbols:folder-zip-outline-rounded'
                : 'material-symbols:description-outline-rounded'
            "
          />
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
  @apply flex min-h-40 cursor-pointer items-center justify-center gap-4 rounded-2xl border border-dashed border-[#4a4a4a] p-6 transition-all duration-200 max-sm:flex-col max-sm:text-center;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.08), transparent 34%),
    linear-gradient(180deg, rgba(24, 24, 24, 0.98), rgba(31, 31, 31, 0.92));
}

.files-dropzone__surface:hover:not(.files-dropzone__surface--disabled),
.files-dropzone__surface--dragging {
  @apply -translate-y-px border-blue-400/80;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.16), transparent 40%),
    linear-gradient(180deg, rgba(24, 24, 24, 0.98), rgba(31, 31, 31, 0.95));
}

.files-dropzone__surface--disabled {
  @apply cursor-not-allowed opacity-70;
}

.files-dropzone__icon {
  @apply inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-2xl text-blue-300;
}

.files-dropzone__title {
  @apply text-base font-semibold text-neutral-100;
}

.files-dropzone__description {
  @apply mt-1 text-sm text-neutral-400;
}

.files-dropzone__link {
  @apply cursor-pointer text-blue-300 underline-offset-2 hover:underline;
}

.files-dropzone__footer {
  @apply flex flex-wrap items-center justify-between gap-3;
}

.files-dropzone__chips {
  @apply flex min-w-0 flex-1 flex-wrap gap-2;
}

.files-dropzone__chip {
  @apply inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#343434] bg-[#171717] px-3 py-1.5 text-[0.8rem] text-neutral-300;
}

.files-dropzone__chip-name {
  @apply truncate;
}

.files-dropzone__chip-meta {
  @apply shrink-0 text-neutral-500;
}

.files-dropzone__clear {
  @apply cursor-pointer rounded-full border border-[#393939] px-3.5 py-1.5 text-neutral-300 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-65;
}

.files-dropzone__clear:hover:not(:disabled) {
  @apply border-red-500 text-red-300;
}
</style>
