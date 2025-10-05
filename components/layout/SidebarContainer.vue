<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWindowSize } from '@vueuse/core'
import LayoutSidebar from '~/components/layout/LayoutSidebar.vue'

const { width } = useWindowSize()
const isMobile = computed(() => width.value < 1024)

const isOpen = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  if (isMobile.value) isOpen.value = false
}
</script>

<template>
  <div class="sidebar">
    <button class="sidebar__toggle" @click="toggle">
      <Icon
        :name="isOpen ? 'material-symbols:close' : 'material-symbols:menu'"
        size="26"
        class="sidebar__toggle-icon"
      />
    </button>

    <transition name="sidebar-fade">
      <div v-if="isMobile && isOpen" class="sidebar__overlay" @click="close"></div>
    </transition>

    <transition name="sidebar-slide">
      <aside v-show="isOpen || !isMobile" class="sidebar__panel">
        <LayoutSidebar @navigate="close" />
      </aside>
    </transition>
  </div>
</template>

<style scoped>
.sidebar {
  position: relative;
}

.sidebar__toggle {
  display: none;
  position: fixed;
  top: 1rem;
  left: 1rem;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  border: 1px solid #333;
  background: #181818;
  color: white;
  z-index: 50;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.sidebar__toggle:hover {
  background: #222;
  border-color: #444;
}

.sidebar__toggle-icon {
  display: block;
  margin: auto;
  line-height: 1;
}

@media (max-width: 1024px) {
  .sidebar__toggle {
    display: flex;
  }
}

.sidebar__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 30;
}

.sidebar__panel {
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  height: 100vh;
  background: #181818;
  z-index: 40;
  transition: transform 0.3s ease;
}

.sidebar-fade-enter-active,
.sidebar-fade-leave-active {
  transition: opacity 0.2s ease;
}
.sidebar-fade-enter-from,
.sidebar-fade-leave-to {
  opacity: 0;
}

.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: transform 0.3s ease;
}
.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  transform: translateX(-100%);
}
</style>
