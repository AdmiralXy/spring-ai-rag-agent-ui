<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  modelValue: File[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [files: File[]]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const fileNames = computed(() => props.modelValue.map((file) => file.name))

function setFiles(fileList: FileList | null) {
  emit('update:modelValue', fileList ? Array.from(fileList) : [])
}

function onFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  setFiles(target.files)
}

function onDragOver() {
  if (props.disabled) return
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(event: DragEvent) {
  if (props.disabled) return
  isDragging.value = false
  setFiles(event.dataTransfer?.files ?? null)
}

function openFileDialog() {
  if (props.disabled) return
  inputRef.value?.click()
}

function clearFiles() {
  emit('update:modelValue', [])
  if (inputRef.value) inputRef.value.value = ''
}
</script>

<template>
  <div class="space-file-dropzone">
    <input
      ref="inputRef"
      type="file"
      multiple
      class="space-file-dropzone__input"
      :disabled="props.disabled"
      @change="onFileInputChange"
    />

    <div
      class="space-file-dropzone__surface"
      :class="{
        'space-file-dropzone__surface--dragging': isDragging,
        'space-file-dropzone__surface--disabled': props.disabled
      }"
      @click="openFileDialog"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <div class="space-file-dropzone__icon-wrap">
        <Icon name="lucide:upload" />
      </div>
      <div class="space-file-dropzone__content">
        <p class="space-file-dropzone__title">Drop files here</p>
        <p class="space-file-dropzone__description">
          or click to choose one or more files for upload
        </p>
      </div>
    </div>

    <div v-if="fileNames.length" class="space-file-dropzone__footer">
      <ul class="space-file-dropzone__files">
        <li v-for="fileName in fileNames" :key="fileName" class="space-file-dropzone__file">
          <Icon name="lucide:file-text" />
          <span>{{ fileName }}</span>
        </li>
      </ul>

      <button
        type="button"
        class="space-file-dropzone__clear"
        :disabled="props.disabled"
        @click="clearFiles"
      >
        Clear
      </button>
    </div>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.space-file-dropzone {
  @apply flex flex-col gap-3.5;
}

.space-file-dropzone__input {
  @apply hidden;
}

.space-file-dropzone__surface {
  @apply flex min-h-36 cursor-pointer items-center justify-center gap-4 p-6 transition-colors max-sm:flex-col max-sm:text-center;
  border-radius: var(--r-lg);
  border: 1.5px dashed var(--c-sep-strong);
  background: var(--c-surface-2);
}

.space-file-dropzone__surface:hover,
.space-file-dropzone__surface--dragging {
  border-color: var(--c-accent-ring);
  background: rgba(10, 132, 255, 0.08);
}

.space-file-dropzone__surface--disabled {
  @apply cursor-not-allowed opacity-60;
}

.space-file-dropzone__icon-wrap {
  @apply inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-xl;
  background: var(--c-accent-soft);
  color: var(--c-accent-hover);
}

.space-file-dropzone__content {
  @apply flex flex-col gap-1;
}

.space-file-dropzone__title {
  @apply text-[15px] font-semibold;
  color: var(--c-text);
}

.space-file-dropzone__description {
  @apply text-sm;
  color: var(--c-text-3);
}

.space-file-dropzone__footer {
  @apply flex flex-wrap items-center justify-between gap-3;
}

.space-file-dropzone__files {
  @apply m-0 flex min-w-0 flex-1 list-none flex-wrap gap-1.5 p-0;
}

.space-file-dropzone__file {
  @apply inline-flex h-7 max-w-full items-center gap-1.5 truncate rounded-full px-2.5 text-xs;
  background: var(--c-surface-3);
  color: var(--c-text-2);
}

.space-file-dropzone__clear {
  @apply h-[30px] cursor-pointer rounded-full border-0 bg-transparent px-3 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50;
  color: var(--c-danger);
}

.space-file-dropzone__clear:hover:not(:disabled) {
  background: var(--c-danger-soft);
}
</style>
