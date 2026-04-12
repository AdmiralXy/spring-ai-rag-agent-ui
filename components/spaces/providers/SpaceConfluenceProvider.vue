<script setup lang="ts">
const props = defineProps<{
  url: string
  login: string
  password: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:url': [value: string]
  'update:login': [value: string]
  'update:password': [value: string]
  submit: []
}>()
</script>

<template>
  <div class="space-provider-panel">
    <label class="space-compact-field">
      <span class="space-compact-icon">
        <Icon name="simple-icons:confluence" />
      </span>
      <input
        :value="props.url"
        type="url"
        placeholder="https://confluence.example.com/..."
        class="space-compact-input"
        :disabled="props.disabled"
        @input="emit('update:url', ($event.target as HTMLInputElement).value)"
        @keyup.enter.exact="emit('submit')"
      />
    </label>

    <div class="space-auth-card">
      <div class="space-section-copy">
        <p class="space-section-title">Authentication</p>
      </div>

      <div class="space-field-grid">
        <label class="space-field">
          <span class="space-field-label">Login</span>
          <input
            :value="props.login"
            type="text"
            autocomplete="username"
            placeholder="Username"
            class="space-field-input"
            :disabled="props.disabled"
            @input="emit('update:login', ($event.target as HTMLInputElement).value)"
            @keyup.enter.exact="emit('submit')"
          />
        </label>

        <label class="space-field">
          <span class="space-field-label">Password</span>
          <input
            :value="props.password"
            type="password"
            autocomplete="current-password"
            placeholder="Password or personal access token"
            class="space-field-input"
            :disabled="props.disabled"
            @input="emit('update:password', ($event.target as HTMLInputElement).value)"
            @keyup.enter.exact="emit('submit')"
          />
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.space-provider-panel {
  @apply flex flex-col gap-[0.9rem];
}

.space-compact-field {
  @apply flex w-full items-center gap-[0.85rem] rounded-[1rem] border border-[#333] px-3 py-2;
  background: linear-gradient(180deg, #141414 0%, #101010 100%);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.space-compact-field:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.18);
}

.space-compact-icon {
  @apply inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full;
  background: rgba(59, 130, 246, 0.14);
  color: #93c5fd;
}

.space-compact-input {
  @apply w-full border-none bg-transparent text-[0.95rem] text-white outline-none;
}

.space-compact-input::placeholder {
  color: #6b7280;
}

.space-auth-card {
  @apply flex flex-col gap-[0.9rem] rounded-[1rem] border p-4;
  border-color: rgba(59, 130, 246, 0.14);
  background: linear-gradient(180deg, rgba(20, 20, 20, 0.96) 0%, rgba(14, 14, 14, 0.98) 100%);
}

.space-section-copy {
  @apply flex flex-col gap-[0.2rem];
}

.space-section-title {
  @apply text-[0.95rem] font-semibold text-gray-100;
}

.space-section-note {
  @apply text-[0.82rem] leading-[1.45] text-gray-400;
}

.space-field-grid {
  @apply grid gap-[0.85rem];
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.space-field {
  @apply flex flex-col gap-[0.45rem];
}

.space-field-label {
  @apply text-[0.82rem] font-medium text-gray-300;
}

.space-field-input {
  @apply w-full rounded-[0.9rem] border border-[#333] bg-[#101010] px-[0.95rem] py-[0.8rem] text-[0.92rem] text-white outline-none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.space-field-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.16);
}

.space-field-input::placeholder {
  color: #6b7280;
}

@media (max-width: 768px) {
  .space-field-grid {
    @apply grid-cols-1;
  }
}
</style>
