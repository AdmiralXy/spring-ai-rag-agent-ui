<script setup lang="ts"></script>

<template>
  <div class="home">
    <span class="home__logo">&lt;/&gt;</span>
  </div>
</template>

<style scoped>
.home {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.home__logo {
  font-size: 6rem;
  font-weight: bold;
  color: #666;
  font-family: 'Fira Code', monospace;
  user-select: none;
}
</style>
