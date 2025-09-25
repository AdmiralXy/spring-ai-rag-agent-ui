<script setup lang="ts">
import LayoutSidebar from '~/components/layout/LayoutSidebar.vue'

useHead({
  title: 'Agent',
  meta: [
    {
      name: 'viewport',
      content: 'width=1920px, initial-scale=1, maximum-scale=1, user-scalable=no'
    }
  ]
})
</script>

<template>
  <UApp :toaster="{ position: 'bottom-right', duration: 5000 }">
    <div class="layout">
      <ConfirmDialog />
      <aside class="layout__sidebar">
        <LayoutSidebar />
      </aside>
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

  &::-webkit-scrollbar {
    width: 1px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #007ca5ff;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
}

.layout {
  display: flex;
  height: 100vh;
  background-color: #212121;
  color: var(--ui-text);
  font-family: 'Open Sans', sans-serif;
}

.layout__sidebar {
  width: 280px;
  background-color: rgb(var(--ui-bg-elevated));
}

.layout__main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
