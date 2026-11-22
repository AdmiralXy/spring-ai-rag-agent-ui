<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <div class="wrapper">
    <div class="ui-page">
      <header
        v-if="title || $slots['header-actions'] || $slots['header-leading']"
        class="ui-page__header"
      >
        <slot name="header-leading" />
        <div class="wrapper__titles">
          <h1 class="ui-title">{{ title }}</h1>
          <p v-if="subtitle" class="ui-subtitle">{{ subtitle }}</p>
        </div>
        <slot name="header-actions" />
      </header>

      <slot />
    </div>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.wrapper {
  @apply h-full overflow-y-auto;
}

.wrapper__titles {
  @apply flex min-w-0 flex-1 flex-col gap-0.5;
}
</style>
