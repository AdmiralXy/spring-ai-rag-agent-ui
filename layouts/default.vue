<script setup lang="ts">
import SidebarContainer from '~/components/layout/SidebarContainer.vue'

useHead({
  title: 'Agent',
  meta: [{ name: 'theme-color', content: '#212121' }]
})
</script>

<template>
  <UApp :toaster="{ position: 'bottom-right', duration: 5000 }">
    <div class="layout">
      <ConfirmDialog />
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
* {
  scrollbar-width: thin;
  scrollbar-color: #474747 transparent;
}

*::-webkit-scrollbar {
  width: 1px;
}
*::-webkit-scrollbar-thumb {
  background-color: #007ca5ff;
  border-radius: 4px;
}
*::-webkit-scrollbar-track {
  background: transparent;
}

body {
  @apply bg-[#212121];
}

.layout {
  @apply flex h-screen bg-[#212121];
}

.layout__main {
  @apply flex flex-col flex-1 transition-all duration-300;
  margin-left: 280px;
  transition: margin-left 0.3s ease;
}

@media (max-width: theme('screens.lg')) {
  .layout__main {
    @apply ml-[0];
  }
}
</style>
