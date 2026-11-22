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
    placeholder="Paste text, notes or documentation…"
    class="ui-input space-text-provider__input"
    :disabled="props.disabled"
    @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    @keyup.enter.exact="emit('submit')"
  />
</template>

<style scoped>
@import 'tailwindcss/theme';

.space-text-provider__input {
  @apply min-h-32 flex-1;
  overflow-wrap: anywhere;
}
</style>
