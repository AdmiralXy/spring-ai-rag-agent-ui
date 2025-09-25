<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ send: [text: string] }>()
const props = defineProps<{ loading?: boolean }>()

const text = ref('')

function submit() {
  if (!text.value.trim() || props.loading) return
  emit('send', text.value)
  text.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}
</script>

<template>
  <form class="chat-input" @submit.prevent="submit">
    <div class="chat-input__wrapper">
      <textarea
        v-model="text"
        placeholder="Ask something..."
        rows="5"
        class="chat-input__field"
        @keydown="onKeydown"
      />
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

.chat-input__field {
  width: 100%;
  padding: 0.75rem 3rem 0.75rem 1rem;
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

.chat-input__button {
  position: absolute;
  bottom: 1.5rem;
  right: 1rem;
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

.chat-input__button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.chat-input__button:hover:not(:disabled) {
  background-color: #2563eb;
}
</style>
