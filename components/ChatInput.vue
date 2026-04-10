<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ send: [payload: { text: string; files: File[] }] }>()
const props = defineProps<{ loading?: boolean }>()

const text = ref('')
const files = ref<File[]>([])
const inputRef = ref<HTMLInputElement | null>(null)

function submit() {
  if ((!text.value.trim() && !files.value.length) || props.loading) return
  emit('send', { text: text.value, files: files.value })
  text.value = ''
  files.value = []
  if (inputRef.value) inputRef.value.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function openFileDialog() {
  if (props.loading) return
  inputRef.value?.click()
}

function onFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  files.value = target.files ? Array.from(target.files) : []
}

function clearFiles() {
  files.value = []
  if (inputRef.value) inputRef.value.value = ''
}
</script>

<template>
  <form class="chat-input" @submit.prevent="submit">
    <div class="chat-input__wrapper">
      <input
        ref="inputRef"
        type="file"
        multiple
        class="chat-input__file-input"
        :disabled="props.loading"
        @change="onFileInputChange"
      />

      <div v-if="files.length" class="chat-input__attachments">
        <div v-for="file in files" :key="file.name" class="chat-input__attachment">
          <Icon name="material-symbols:description-outline-rounded" />
          <span>{{ file.name }}</span>
        </div>
        <button
          type="button"
          class="chat-input__clear"
          :disabled="props.loading"
          @click="clearFiles"
        >
          Clear
        </button>
      </div>

      <textarea
        v-model="text"
        placeholder="Ask something..."
        rows="5"
        class="chat-input__field"
        @keydown="onKeydown"
      />
      <button
        type="button"
        class="chat-input__attach-button"
        :disabled="props.loading"
        @click="openFileDialog"
      >
        <Icon name="material-symbols:attach-file-rounded" />
      </button>
      <button type="submit" class="chat-input__button" :disabled="props.loading">
        <Icon v-if="!props.loading" name="material-symbols:arrow-upward" />
        <Icon v-else name="line-md:loading-twotone-loop" />
      </button>
    </div>
  </form>
</template>

<style scoped>
.chat-input {
  display: flex;
}

.chat-input__wrapper {
  position: relative;
  flex: 1;
}

.chat-input__file-input {
  display: none;
}

.chat-input__attachments {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.6rem;
}

.chat-input__attachment {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.7rem;
  border: 1px solid #3c3c3c;
  border-radius: 999px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-size: 0.8rem;
}

.chat-input__attachment span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-input__clear {
  font-size: 0.8rem;
  border: 1px solid #3c3c3c;
  border-radius: 999px;
  background: transparent;
  color: #cfcfcf;
  cursor: pointer;
  padding: 0.35rem 0.75rem;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.chat-input__clear:hover:not(:disabled) {
  border-color: #ef4444;
  color: #fca5a5;
}

.chat-input__field {
  width: 100%;
  padding: 0.75rem 3rem 0.75rem 3.4rem;
  border-radius: 0.75rem;
  border: 1px solid #3c3c3c;
  outline: none;
  resize: none;
  font-family: inherit;
  line-height: 1.4;
}

.chat-input__field:focus {
  box-shadow: 0 0 0 2px #353535;
}

.chat-input__attach-button,
.chat-input__button {
  position: absolute;
  bottom: 1.5rem;
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 50%;
  background-color: #474747;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: background-color 0.2s;
}

.chat-input__attach-button {
  left: 0.75rem;
}

.chat-input__button {
  right: 1rem;
}

.chat-input__attach-button:hover:not(:disabled),
.chat-input__button:hover:not(:disabled) {
  background-color: #2563eb;
}

.chat-input__attach-button:disabled,
.chat-input__button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
