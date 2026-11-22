<script setup lang="ts">
import type { ProviderOption, UploadProvider } from '~/types/spaceUpload'

const props = defineProps<{
  modelValue: UploadProvider
  items?: ProviderOption[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: UploadProvider]
}>()

const defaultOptions: ProviderOption[] = [
  { value: 'text', label: 'Text', icon: 'lucide:text' },
  { value: 'files', label: 'Files', icon: 'lucide:upload' },
  { value: 'confluence', label: 'Confluence', icon: 'simple-icons:confluence' },
  { value: 'git', label: 'Git', icon: 'simple-icons:git' }
]

function selectProvider(value: UploadProvider) {
  if (props.disabled) return
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="ui-segmented space-provider-selector" role="radiogroup" aria-label="Source">
    <button
      v-for="option in props.items ?? defaultOptions"
      :key="option.value"
      type="button"
      role="radio"
      class="ui-segmented__item space-provider-selector__item"
      :aria-checked="option.value === props.modelValue"
      :disabled="props.disabled"
      @click="selectProvider(option.value)"
    >
      <Icon :name="option.icon" class="space-provider-selector__icon" />
      <span>{{ option.label }}</span>
    </button>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.space-provider-selector {
  @apply grid w-full grid-flow-col;
  grid-auto-columns: minmax(0, 1fr);
}

.space-provider-selector__item {
  @apply h-[34px];
}

.space-provider-selector__icon {
  @apply flex-none text-sm;
}
</style>
