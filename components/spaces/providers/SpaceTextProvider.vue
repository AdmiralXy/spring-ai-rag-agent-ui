<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: []
}>()
</script>

<template>
  <textarea
    :value="props.modelValue"
    rows="4"
    placeholder="Inspiration is a guest that does not willingly visit the lazy..."
    class="space-text-provider__input"
    :disabled="props.disabled"
    @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    @keyup.enter.exact="emit('submit')"
  />
</template>

<style scoped>
@import 'tailwindcss/theme';

.space-text-provider__input {
  min-height: 7.5rem;
  width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
  border-radius: 1rem;
  @apply flex-1 resize-y border border-[#333] bg-[#111] px-4 py-3 text-white transition-all duration-200 outline-none;
}

.space-text-provider__input:focus {
  @apply border-blue-500 ring-2 ring-blue-500/30;
}
</style>
