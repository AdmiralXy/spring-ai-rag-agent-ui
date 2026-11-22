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
