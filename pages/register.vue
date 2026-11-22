<script setup lang="ts">
import AuthForm from '~/components/auth/AuthForm.vue'

definePageMeta({ layout: 'auth', public: true })
useHead({ title: 'Create account · Agent' })

const auth = useAuthStore()
await useAsyncData('auth-config', () => auth.fetchConfig().then(() => true))
</script>

<template>
  <AuthForm mode="register" />
</template>
