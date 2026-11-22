<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { useRoute } from 'vue-router'
import LayoutSidebar from '~/components/layout/LayoutSidebar.vue'

const { width } = useWindowSize()
const isMobile = computed(() => width.value < 1024)
const isOpen = ref(false)
const route = useRoute()

function close() {
  if (isMobile.value) isOpen.value = false
}

watch(() => route.fullPath, close)
</script>

<template>
  <div class="sidebar">
    <button
      v-show="!isOpen"
      type="button"
      class="sidebar__toggle"
      aria-label="Open sidebar"
      :aria-expanded="isOpen"
      @click="isOpen = true"
    >
      <Icon name="lucide:panel-left-open" />
    </button>

    <transition name="sidebar-fade">
      <div v-if="isMobile && isOpen" class="sidebar__overlay" @click="close"></div>
    </transition>

    <aside class="sidebar__panel" :class="{ 'sidebar__panel--open': isOpen }">
      <LayoutSidebar :closable="isMobile" @navigate="close" @close="close" />
    </aside>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.sidebar {
  @apply relative flex-none;
}

.sidebar__panel {
  @apply h-dvh w-[272px];
}

.sidebar__toggle {
  @apply fixed top-2 left-3 z-50 hidden h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] text-[18px] transition-colors;
  background: var(--c-surface-2);
  border: 1px solid var(--c-sep-strong);
  color: var(--c-text-2);
}

.sidebar__toggle:hover,
.sidebar__toggle:active {
  background: var(--c-surface-3);
  color: var(--c-text);
}

.sidebar__overlay {
  @apply fixed inset-0 z-30;
  background: rgba(0, 0, 0, 0.6);
}

@media (max-width: 1023px) {
  .sidebar__toggle {
    @apply flex;
  }

  .sidebar__panel {
    @apply fixed top-0 left-0 z-40 w-[300px] max-w-[85vw];
    transform: translateX(-100%);
    transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
    box-shadow: var(--shadow-pop);
  }

  .sidebar__panel--open {
    transform: translateX(0);
  }
}

.sidebar-fade-enter-active,
.sidebar-fade-leave-active {
  transition: opacity 0.2s ease;
}

.sidebar-fade-enter-from,
.sidebar-fade-leave-to {
  opacity: 0;
}
</style>
