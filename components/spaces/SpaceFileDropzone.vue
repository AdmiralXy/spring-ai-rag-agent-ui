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
        <Icon name="material-symbols:upload-file-outline-rounded" />
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
          <Icon name="material-symbols:description-outline-rounded" />
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
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.space-file-dropzone__input {
  display: none;
}

.space-file-dropzone__surface {
  display: flex;
  min-height: 10rem;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  border: 1px dashed #4a4a4a;
  border-radius: 1rem;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.08), transparent 34%),
    linear-gradient(180deg, rgba(24, 24, 24, 0.98), rgba(31, 31, 31, 0.92));
  padding: 1.5rem;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;
}

.space-file-dropzone__surface:hover:not(.space-file-dropzone__surface--disabled),
.space-file-dropzone__surface--dragging {
  border-color: rgba(96, 165, 250, 0.8);
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.16), transparent 40%),
    linear-gradient(180deg, rgba(24, 24, 24, 0.98), rgba(31, 31, 31, 0.95));
  transform: translateY(-1px);
}

.space-file-dropzone__surface--disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.space-file-dropzone__icon-wrap {
  display: inline-flex;
  width: 3.5rem;
  height: 3.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.14);
  color: #93c5fd;
  font-size: 1.5rem;
}

.space-file-dropzone__content {
  text-align: left;
}

.space-file-dropzone__title {
  margin: 0;
  color: #f5f5f5;
  font-size: 1rem;
  font-weight: 600;
}

.space-file-dropzone__description {
  margin: 0.25rem 0 0;
  color: #a3a3a3;
  font-size: 0.875rem;
}

.space-file-dropzone__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.space-file-dropzone__files {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.space-file-dropzone__file {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid #343434;
  border-radius: 999px;
  background: #171717;
  padding: 0.375rem 0.75rem;
  color: #d4d4d4;
  font-size: 0.8rem;
}

.space-file-dropzone__file span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.space-file-dropzone__clear {
  border: 1px solid #393939;
  border-radius: 999px;
  background: transparent;
  color: #d4d4d4;
  cursor: pointer;
  padding: 0.45rem 0.9rem;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.space-file-dropzone__clear:hover:not(:disabled) {
  border-color: #ef4444;
  color: #fca5a5;
}

.space-file-dropzone__clear:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

@media (max-width: 640px) {
  .space-file-dropzone__surface {
    flex-direction: column;
    text-align: center;
  }

  .space-file-dropzone__content {
    text-align: center;
  }
}
</style>
