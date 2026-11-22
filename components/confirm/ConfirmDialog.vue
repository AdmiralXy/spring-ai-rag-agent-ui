<script setup lang="ts">
import { useConfirmDialog } from '~/composables/useConfirmDialog'

const { isOpen, title, subtitle, confirmYes, confirmNo } = useConfirmDialog()
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="title"
    :description="subtitle || 'Please confirm this action.'"
    :ui="{ content: 'max-w-sm', footer: 'justify-end' }"
  >
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <button type="button" class="ui-btn ui-btn--ghost" @click="confirmNo">Cancel</button>
        <button type="button" class="ui-btn ui-btn--primary" @click="confirmYes">Confirm</button>
      </div>
    </template>
  </UModal>
</template>
