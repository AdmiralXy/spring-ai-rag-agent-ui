<script setup lang="ts">
import { useConfirmDialog } from '~/composables/useConfirmDialog'

const { isOpen, title, subtitle, confirmYes, confirmNo } = useConfirmDialog()
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="title"
    :description="subtitle || 'Please confirm this action.'"
    :ui="{
      overlay: 'bg-[#272727ED]',
      content: 'bg-[#171717] border-none !divide-none !ring-0 !shadow-none'
    }"
  >
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton variant="solid" @click="confirmYes">Confirm</UButton>
        <UButton color="neutral" variant="solid" @click="confirmNo">Cancel</UButton>
      </div>
    </template>
  </UModal>
</template>
