<script setup lang="ts">
import SidebarContainer from '~/components/layout/SidebarContainer.vue'
import NewChatDialog from '~/components/layout/NewChatDialog.vue'

useHead({
  title: 'Agent',
  meta: [{ name: 'theme-color', content: '#000000' }]
})
</script>

<template>
  <UApp :toaster="{ position: 'bottom-right', duration: 5000 }">
    <div class="layout">
      <ConfirmDialog />
      <NewChatDialog />
      <SidebarContainer />

      <main class="layout__main">
        <LayoutTabs>
          <slot />
        </LayoutTabs>
      </main>
    </div>
  </UApp>
</template>

<style>
@import 'tailwindcss/theme';

.layout {
  @apply flex h-dvh overflow-hidden;
  background: var(--c-bg);
}

.layout__main {
  @apply flex min-w-0 flex-1 flex-col overflow-hidden;
}
</style>
