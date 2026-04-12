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
        <p class="space-section-title">Confluence credentials</p>
        <p class="space-section-note">
          Login and password are required. They are stored only in this browser.
        </p>
      </div>

      <div class="space-field-grid">
        <label class="space-field">
          <span class="space-field-label">Login</span>
          <input
            :value="props.login"
            type="text"
            autocomplete="username"
            placeholder="john.doe"
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
            placeholder="Password"
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
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.space-compact-field {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.85rem;
  border: 1px solid #333;
  border-radius: 1rem;
  background: linear-gradient(180deg, #141414 0%, #101010 100%);
  padding: 0.5rem 0.75rem;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.space-compact-field:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.18);
}

.space-compact-icon {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.14);
  color: #93c5fd;
}

.space-compact-input {
  width: 100%;
  border: none;
  background: transparent;
  color: #fff;
  outline: none;
  font-size: 0.95rem;
}

.space-compact-input::placeholder {
  color: #6b7280;
}

.space-auth-card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  border: 1px solid rgba(59, 130, 246, 0.14);
  border-radius: 1rem;
  background: linear-gradient(180deg, rgba(20, 20, 20, 0.96) 0%, rgba(14, 14, 14, 0.98) 100%);
  padding: 1rem;
}

.space-section-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.space-section-title {
  color: #f3f4f6;
  font-size: 0.95rem;
  font-weight: 600;
}

.space-section-note {
  color: #9ca3af;
  font-size: 0.82rem;
  line-height: 1.45;
}

.space-field-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.space-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.space-field-label {
  color: #d1d5db;
  font-size: 0.82rem;
  font-weight: 500;
}

.space-field-input {
  width: 100%;
  border: 1px solid #333;
  border-radius: 0.9rem;
  background: #101010;
  color: #fff;
  outline: none;
  padding: 0.8rem 0.95rem;
  font-size: 0.92rem;
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
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
