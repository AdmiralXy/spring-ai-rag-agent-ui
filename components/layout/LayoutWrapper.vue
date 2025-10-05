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
  @apply flex flex-col h-full overflow-hidden box-border p-6;
}

.wrapper__header {
  @apply flex items-center justify-between mb-4 max-lg:mt-12;
}

.wrapper__title {
  @apply text-[1.5rem] font-bold text-white;
}

.wrapper__content {
  @apply flex-1 flex flex-col gap-2 pr-1 overflow-y-auto scroll-smooth;
}
</style>
