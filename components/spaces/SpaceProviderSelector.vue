<script setup lang="ts">
type UploadProvider = 'text' | 'files' | 'confluence' | 'git'

interface ProviderOption {
  value: UploadProvider
  label: string
  icon: string
}

const props = defineProps<{
  modelValue: UploadProvider
  items?: ProviderOption[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: UploadProvider]
}>()

const defaultOptions: ProviderOption[] = [
  { value: 'text', label: 'Text', icon: 'material-symbols:text-snippet-outline-rounded' },
  { value: 'files', label: 'Files', icon: 'material-symbols:upload-file-outline-rounded' },
  { value: 'confluence', label: 'Confluence', icon: 'simple-icons:confluence' },
  { value: 'git', label: 'Git', icon: 'mdi:git' }
]

function selectProvider(value: UploadProvider) {
  if (props.disabled) return
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="space-provider-selector">
    <button
      v-for="option in props.items ?? defaultOptions"
      :key="option.value"
      type="button"
      class="space-provider-selector__button"
      :class="{
        'space-provider-selector__button--active': option.value === props.modelValue
      }"
      :disabled="props.disabled"
      @click="selectProvider(option.value)"
    >
      <span class="space-provider-selector__icon-wrap">
        <Icon :name="option.icon" class="space-provider-selector__icon" />
      </span>
      <span class="space-provider-selector__label">{{ option.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.space-provider-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.875rem;
}

.space-provider-selector__button {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  border: none;
  background: transparent;
  color: #a9a9a9;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    color 0.2s ease;
}

.space-provider-selector__button:hover:not(:disabled) {
  color: #f1f1f1;
  transform: translateY(-1px);
}

.space-provider-selector__button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.space-provider-selector__icon-wrap {
  display: inline-flex;
  width: 3.25rem;
  height: 3.25rem;
  align-items: center;
  justify-content: center;
  border: 1px solid #3a3a3a;
  border-radius: 999px;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.07), transparent 62%),
    linear-gradient(180deg, #2c2c2c 0%, #171717 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 8px 24px rgba(0, 0, 0, 0.22);
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.space-provider-selector__button--active .space-provider-selector__icon-wrap {
  border-color: rgba(210, 210, 210, 0.5);
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.14), transparent 58%),
    linear-gradient(180deg, #3a3a3a 0%, #1c1c1c 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 10px 24px rgba(0, 0, 0, 0.28);
}

.space-provider-selector__icon {
  font-size: 1.35rem;
}

.space-provider-selector__label {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}
</style>
