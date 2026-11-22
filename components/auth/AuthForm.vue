<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { errorMessage } from '~/composables/useApi'
import PasswordInput from '~/components/auth/PasswordInput.vue'

const MIN_PASSWORD = 8

const props = defineProps<{ mode: 'login' | 'register' }>()

const auth = useAuthStore()
const route = useRoute()

const email = ref('')
const password = ref('')
const confirmation = ref('')
const error = ref('')
const submitting = ref(false)
const emailRef = ref<HTMLInputElement | null>(null)

const isRegister = computed(() => props.mode === 'register')
const closed = computed(() => isRegister.value && !auth.registrationEnabled)
const passwordTooShort = computed(
  () => isRegister.value && password.value.length > 0 && password.value.length < MIN_PASSWORD
)
const mismatch = computed(
  () => isRegister.value && confirmation.value.length > 0 && confirmation.value !== password.value
)
const canSubmit = computed(() => {
  if (closed.value || !email.value.trim() || !password.value || submitting.value) return false
  if (!isRegister.value) return true
  return password.value.length >= MIN_PASSWORD && confirmation.value === password.value
})

onMounted(() => emailRef.value?.focus())

function target() {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/'
}

async function submit() {
  if (!canSubmit.value) return
  error.value = ''
  submitting.value = true
  try {
    if (isRegister.value) await auth.register(email.value.trim(), password.value)
    else await auth.login(email.value.trim(), password.value)
    password.value = ''
    confirmation.value = ''
    // a full load starts every store from scratch for the new account
    window.location.href = target()
  } catch (err) {
    error.value = errorMessage(err, isRegister.value ? 'Sign up failed' : 'Sign in failed')
    submitting.value = false
  }
}
</script>

<template>
  <div class="auth">
    <div class="auth__brand">
      <span class="auth__mark"><Icon name="lucide:sparkle" /></span>
      <h1 class="auth__title">{{ isRegister ? 'Create your account' : 'Welcome back' }}</h1>
      <p class="auth__subtitle">
        {{
          isRegister
            ? 'Your chats, spaces, files and models stay private to you.'
            : 'Sign in to continue to Agent.'
        }}
      </p>
    </div>

    <form class="auth__card" novalidate @submit.prevent="submit">
      <label class="auth__field">
        <span class="auth__label">Email</span>
        <input
          ref="emailRef"
          v-model="email"
          type="email"
          class="ui-input auth__input"
          placeholder="Enter your email"
          autocomplete="email"
          autocapitalize="off"
          spellcheck="false"
          required
        />
      </label>

      <div class="auth__field">
        <span class="auth__label">Password</span>
        <PasswordInput
          v-model="password"
          :autocomplete="isRegister ? 'new-password' : 'current-password'"
          :placeholder="isRegister ? `At least ${MIN_PASSWORD} characters` : 'Password'"
        />
        <span v-if="passwordTooShort" class="auth__hint auth__hint--warn">
          Use at least {{ MIN_PASSWORD }} characters
        </span>
      </div>

      <div v-if="isRegister" class="auth__field">
        <span class="auth__label">Confirm password</span>
        <PasswordInput
          v-model="confirmation"
          autocomplete="new-password"
          placeholder="Repeat the password"
        />
        <span v-if="mismatch" class="auth__hint auth__hint--warn">Passwords do not match</span>
      </div>

      <p v-if="closed" class="auth__error" role="status">
        <Icon name="lucide:lock" class="flex-none" />
        <span>Registration is closed on this server. Ask the owner for an account.</span>
      </p>

      <p v-if="error" class="auth__error" role="alert">
        <Icon name="lucide:circle-alert" class="flex-none" />
        <span>{{ error }}</span>
      </p>

      <button
        type="submit"
        class="ui-btn ui-btn--primary ui-btn--lg auth__submit"
        :disabled="!canSubmit"
      >
        <Icon v-if="submitting" name="lucide:loader-circle" class="animate-spin" />
        {{ isRegister ? 'Create account' : 'Sign in' }}
      </button>
    </form>

    <p class="auth__switch">
      <template v-if="isRegister">
        Already have an account?
        <NuxtLink :to="{ path: '/login', query: route.query }" class="auth__link">Sign in</NuxtLink>
      </template>
      <template v-else-if="auth.registrationEnabled">
        New here?
        <NuxtLink :to="{ path: '/register', query: route.query }" class="auth__link">
          Create an account
        </NuxtLink>
      </template>
      <template v-else>Registration is closed on this server.</template>
    </p>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.auth {
  @apply flex flex-col gap-6;
}

.auth__brand {
  @apply flex flex-col items-center gap-2 text-center;
}

.auth__mark {
  @apply mb-2 flex h-12 w-12 items-center justify-center rounded-[14px] text-[22px];
  background: var(--c-surface-2);
  border: 1px solid var(--c-sep-strong);
  color: var(--c-accent);
  box-shadow: 0 8px 30px rgba(10, 132, 255, 0.18);
}

.auth__title {
  @apply m-0 text-[26px] leading-tight font-bold tracking-[-0.02em];
  color: var(--c-text);
}

.auth__subtitle {
  @apply m-0 text-sm;
  color: var(--c-text-3);
}

.auth__card {
  @apply flex flex-col gap-4 p-6 max-sm:p-5;
  border-radius: var(--r-xl);
  background: var(--c-surface);
  border: 1px solid var(--c-sep);
  box-shadow: var(--shadow-pop);
}

.auth__field {
  @apply flex flex-col gap-1.5;
}

.auth__label {
  @apply px-0.5 text-[12.5px] font-medium;
  color: var(--c-text-3);
}

.auth__input {
  @apply h-11;
}

.auth__hint {
  @apply px-0.5 text-xs;
  color: var(--c-text-4);
}

.auth__hint--warn {
  color: var(--c-warning);
}

.auth__error {
  @apply m-0 flex items-start gap-2 rounded-[10px] px-3 py-2.5 text-[13px] leading-snug;
  background: var(--c-danger-soft);
  color: var(--c-danger);
}

.auth__error :deep(svg) {
  @apply mt-0.5;
}

.auth__submit {
  @apply mt-1 h-11 w-full;
}

.auth__switch {
  @apply m-0 text-center text-sm;
  color: var(--c-text-3);
}

.auth__link {
  @apply font-medium;
  color: var(--c-accent);
}

.auth__link:hover {
  color: var(--c-accent-hover);
}
</style>
