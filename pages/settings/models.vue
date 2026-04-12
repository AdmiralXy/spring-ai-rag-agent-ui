<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ChatModelsSection from '~/components/settings/models/ChatModelsSection.vue'
import EmbeddingsModelSection from '~/components/settings/models/EmbeddingsModelSection.vue'
import SummarizerModelSection from '~/components/settings/models/SummarizerModelSection.vue'

type SettingsView = 'chat' | 'embeddings' | 'summarizer'

const api = useApi()
const settingsStore = useModelSettingsStore()
const AUTH_KEY = 'settings-page-authenticated'
const AUTH_PASSWORD_KEY = 'settings-page-password'

const views: Array<{ key: SettingsView; label: string; hint: string }> = [
  { key: 'chat', label: 'Chat models', hint: 'Multiple models configuration' },
  { key: 'embeddings', label: 'Embeddings', hint: 'Singleton model configuration' },
  { key: 'summarizer', label: 'Summarizer', hint: 'Singleton model configuration' }
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

  authLoading.value = true
  try {
    await api.get('/settings/models/verify', {
      headers: {
        Authorization: `Basic ${password.value}`
      }
    })

    sessionStorage.setItem(AUTH_KEY, '1')
    sessionStorage.setItem(AUTH_PASSWORD_KEY, password.value)
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
    <div v-if="checkingAuth" class="settings__auth settings__auth--muted">Checking access...</div>

    <div v-else-if="!isAuthorized" class="settings__auth">
      <h3 class="settings__auth-title">Protected settings</h3>
      <p class="settings__auth-subtitle">Enter password to continue</p>
      <input
        v-model="password"
        type="password"
        class="settings__auth-input"
        placeholder="Password"
        @keyup.enter="unlockSettings"
      />
      <p v-if="authError" class="settings__auth-error">{{ authError }}</p>
      <UButton
        class="settings__auth-button"
        color="primary"
        variant="solid"
        size="md"
        :disabled="!password.trim()"
        :loading="authLoading"
        @click="unlockSettings"
      >
        Unlock
      </UButton>
    </div>

    <template v-else>
      <div class="settings__switcher">
        <button
          v-for="view in views"
          :key="view.key"
          type="button"
          class="settings__switcher-button"
          :class="{ 'settings__switcher-button--active': activeView === view.key }"
          @click="activeView = view.key"
        >
          <span>{{ view.label }}</span>
          <small>{{ view.hint }}</small>
        </button>
      </div>

      <ClientOnly>
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
    </template>
  </LayoutWrapper>
</template>

<style scoped>
@import 'tailwindcss/theme';

.settings__switcher {
  @apply mb-4 grid gap-2 md:grid-cols-3;
}

.settings__switcher-button {
  @apply flex cursor-pointer flex-col rounded-lg border border-[#3a3a3a] bg-[#1d1d1d] p-3 text-left text-white transition-colors duration-200;
}

.settings__switcher-button:hover {
  @apply border-[#4a4a4a] bg-[#242424];
}

.settings__switcher-button--active {
  @apply border-[#007ca5] bg-[#11313f];
}

.settings__switcher-button small {
  @apply mt-1 text-xs text-gray-400;
}

.settings__auth {
  @apply mx-auto mt-8 flex w-full max-w-md flex-col gap-3 rounded-lg border border-[#333] bg-[#1d1d1d] p-4;
}

.settings__auth--muted {
  @apply text-sm text-gray-400;
}

.settings__auth-title {
  @apply text-lg font-semibold text-white;
}

.settings__auth-subtitle {
  @apply text-sm text-gray-400;
}

.settings__auth-input {
  @apply w-full rounded-md border border-[#3d3d3d] bg-[#111] px-3 py-2 text-white outline-none;
}

.settings__auth-input:focus {
  @apply border-blue-500 ring-2 ring-blue-500/30;
}

.settings__auth-error {
  @apply text-sm text-red-400;
}

.settings__auth-button {
  @apply mt-1 w-full justify-center rounded-md font-medium;
}
</style>
