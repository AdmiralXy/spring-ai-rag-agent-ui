<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="wrapper">
    <header v-if="title" class="wrapper__header">
      <h1 class="wrapper__title">{{ title }}</h1>
      <slot name="header-actions" />
    </header>

    <main class="wrapper__content">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.5rem;
  box-sizing: border-box;
  overflow: hidden;
}

.wrapper__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.wrapper__title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #fff;
}

.wrapper__content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-right: 0.25rem;
  scroll-behavior: smooth;
}
</style>
