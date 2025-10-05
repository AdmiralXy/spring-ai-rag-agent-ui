<script setup lang="ts">
import SidebarContainer from '~/components/layout/SidebarContainer.vue'

useHead({ title: 'Agent' })
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
}

.layout__main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
