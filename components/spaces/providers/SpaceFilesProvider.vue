<script setup lang="ts">
import SpaceFileDropzone from '~/components/spaces/SpaceFileDropzone.vue'

const props = defineProps<{
  modelValue: File[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: File[]]
}>()
</script>

<template>
  <SpaceFileDropzone
    :model-value="props.modelValue"
    :disabled="props.disabled"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
