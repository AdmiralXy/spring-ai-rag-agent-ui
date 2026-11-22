<script setup lang="ts">
useHead({
  title: 'Agent',
  meta: [{ name: 'theme-color', content: '#000000' }]
})
</script>

<template>
  <UApp :toaster="{ position: 'bottom-right', duration: 5000 }">
    <div class="auth-layout">
      <div class="auth-layout__glow" aria-hidden="true"></div>
      <main class="auth-layout__main">
        <slot />
      </main>
    </div>
  </UApp>
</template>

<style>
@import 'tailwindcss/theme';

.auth-layout {
  @apply relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10;
  background: var(--c-bg);
}

.auth-layout__glow {
  @apply pointer-events-none absolute top-[-280px] left-1/2 h-[560px] w-[760px] -translate-x-1/2 rounded-full;
  background: radial-gradient(closest-side, rgba(10, 132, 255, 0.16), transparent);
}

.auth-layout__main {
  @apply relative w-full max-w-[400px];
}
</style>
