<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ChatModelsSection from '~/components/settings/models/ChatModelsSection.vue'
import EmbeddingsModelSection from '~/components/settings/models/EmbeddingsModelSection.vue'
import SummarizerModelSection from '~/components/settings/models/SummarizerModelSection.vue'
import { toBase64 } from '~/utils/uploadCrypto'

type SettingsView = 'chat' | 'embeddings' | 'summarizer'

const api = useApi()
const settingsStore = useModelSettingsStore()
const AUTH_KEY = 'settings-page-authenticated'
const AUTH_PASSWORD_KEY = 'settings-page-password'
const AUTH_USERNAME = 'admin'

/** Basic auth token for `admin:<password>`; UTF-8, so non-Latin passwords work too. */
function basicToken(pass: string) {
  return toBase64(new TextEncoder().encode(`${AUTH_USERNAME}:${pass}`))
}

const views: Array<{ key: SettingsView; label: string }> = [
  { key: 'chat', label: 'Chat models' },
  { key: 'embeddings', label: 'Embeddings' },
  { key: 'summarizer', label: 'Summarizer' }
]

const activeView = ref<SettingsView>('chat')
const isAuthorized = ref(false)
const checkingAuth = ref(true)
const authLoading = ref(false)
const password = ref('')
const authError = ref('')

async function loadSettingsData() {
  await Promise.all([
    settingsStore.fetchChatModels(),
    settingsStore.fetchEmbeddings(),
    settingsStore.fetchSummarizer()
  ])
}

onMounted(async () => {
  const stored = sessionStorage.getItem(AUTH_KEY)
  const storedPassword = sessionStorage.getItem(AUTH_PASSWORD_KEY)
  isAuthorized.value = stored === '1'

  if (isAuthorized.value && storedPassword) {
    await loadSettingsData()
  } else if (isAuthorized.value && !storedPassword) {
    isAuthorized.value = false
    sessionStorage.removeItem(AUTH_KEY)
  }

  checkingAuth.value = false
})

async function unlockSettings() {
  authError.value = ''

  if (!password.value.trim()) {
    authError.value = 'Enter password'
    return
  }

  const token = basicToken(password.value)
  authLoading.value = true
  try {
    await api.get('/settings/models/verify', {
      headers: {
        Authorization: `Basic ${token}`
      }
    })

    sessionStorage.setItem(AUTH_KEY, '1')
    // the store sends this value as `Basic <token>`
    sessionStorage.setItem(AUTH_PASSWORD_KEY, token)
    isAuthorized.value = true
    password.value = ''
    await loadSettingsData()
  } catch {
    authError.value = 'Invalid password'
  } finally {
    authLoading.value = false
  }
}
</script>

<template>
  <LayoutWrapper title="Settings">
    <template v-if="isAuthorized" #header-actions>
      <div class="ui-segmented" role="tablist" aria-label="Settings section">
        <button
          v-for="view in views"
          :key="view.key"
          type="button"
          role="tab"
          class="ui-segmented__item"
          :aria-selected="activeView === view.key"
          @click="activeView = view.key"
        >
          {{ view.label }}
        </button>
      </div>
    </template>

    <div v-if="checkingAuth" class="ui-subtitle">Checking access…</div>

    <form v-else-if="!isAuthorized" class="lock" @submit.prevent="unlockSettings">
      <div class="lock__icon"><Icon name="lucide:lock" /></div>
      <h2 class="lock__title">Settings are locked</h2>
      <p class="lock__text">Enter the admin password to manage models and API keys.</p>
      <label for="settings-password" class="ui-sr-only">Password</label>
      <input
        id="settings-password"
        v-model="password"
        type="password"
        class="ui-input lock__input"
        placeholder="Password"
        autocomplete="current-password"
      />
      <p v-if="authError" class="lock__error" role="alert">{{ authError }}</p>
      <button
        type="submit"
        class="ui-btn ui-btn--primary ui-btn--lg lock__button"
        :disabled="!password.trim() || authLoading"
      >
        <Icon v-if="authLoading" name="lucide:loader-circle" class="animate-spin" />
        Unlock
      </button>
    </form>

    <ClientOnly v-else>
      <ChatModelsSection
        v-if="activeView === 'chat'"
        :models="settingsStore.chatModels"
        :loading="settingsStore.loadingChat"
        @create="settingsStore.createChatModel"
        @update="settingsStore.updateChatModel"
        @remove="settingsStore.deleteChatModel"
      />

      <EmbeddingsModelSection
        v-else-if="activeView === 'embeddings'"
        :model="settingsStore.embeddings"
        :loading="settingsStore.loadingEmbeddings"
        @save="settingsStore.updateEmbeddings"
      />

      <SummarizerModelSection
        v-else
        :model="settingsStore.summarizer"
        :loading="settingsStore.loadingSummarizer"
        @save="settingsStore.updateSummarizer"
      />
    </ClientOnly>
  </LayoutWrapper>
</template>

<style scoped>
@import 'tailwindcss/theme';

.lock {
  @apply mx-auto mt-10 flex w-full max-w-[380px] flex-col items-center gap-3 text-center;
}

.lock__icon {
  @apply mb-1 flex h-12 w-12 items-center justify-center rounded-[14px] text-xl;
  background: var(--c-surface-2);
  border: 1px solid var(--c-sep-strong);
  color: var(--c-text-2);
}

.lock__title {
  @apply m-0 text-xl font-semibold;
  color: var(--c-text);
}

.lock__text {
  @apply m-0 mb-2 text-sm;
  color: var(--c-text-3);
}

.lock__input {
  @apply h-11 text-center;
}

.lock__error {
  @apply m-0 text-sm;
  color: var(--c-danger);
}

.lock__button {
  @apply w-full;
}
</style>
