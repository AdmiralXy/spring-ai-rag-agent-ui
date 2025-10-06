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
@import 'tailwindcss/theme';

.wrapper {
  @apply box-border flex h-full flex-col overflow-hidden p-6;
}

.wrapper__header {
  @apply mb-4 flex items-center justify-between max-lg:mt-12;
}

.wrapper__title {
  @apply text-[1.5rem] font-bold text-white;
}

.wrapper__content {
  @apply flex flex-1 flex-col gap-2 overflow-y-auto scroll-smooth pr-1;
}
</style>
