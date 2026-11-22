<script setup lang="ts">
import { ref } from 'vue'

const model = defineModel<string>({ required: true })

withDefaults(
  defineProps<{
    placeholder?: string
    autocomplete?: string
    disabled?: boolean
  }>(),
  { placeholder: 'Password', autocomplete: 'current-password', disabled: false }
)

const reveal = ref(false)
</script>

<template>
  <div class="password">
    <input
      v-model="model"
      :type="reveal ? 'text' : 'password'"
      class="ui-input password__input"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
      spellcheck="false"
    />
    <button
      type="button"
      class="password__reveal"
      :aria-label="reveal ? 'Hide password' : 'Show password'"
      :title="reveal ? 'Hide' : 'Show'"
      tabindex="-1"
      @click="reveal = !reveal"
    >
      <Icon :name="reveal ? 'lucide:eye-off' : 'lucide:eye'" />
    </button>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.password {
  @apply relative;
}

.password__input {
  @apply h-11 pr-11;
}

.password__reveal {
  @apply absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent text-base;
  color: var(--c-text-3);
}

.password__reveal:hover {
  background: var(--c-hover);
  color: var(--c-text);
}
</style>
