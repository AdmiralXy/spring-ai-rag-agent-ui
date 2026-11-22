<script setup lang="ts">
import { ref } from 'vue'
import ChatModelsSection from '~/components/settings/models/ChatModelsSection.vue'
import EmbeddingsModelSection from '~/components/settings/models/EmbeddingsModelSection.vue'
import SummarizerModelSection from '~/components/settings/models/SummarizerModelSection.vue'
import { useConfirmDialog } from '~/composables/useConfirmDialog'
import useNotification from '~/composables/useNotification'
import { NotificationType } from '~/types/notification'

type ModelsView = 'chat' | 'embeddings' | 'summarizer'

useHead({ title: 'Models · Settings' })

const settingsStore = useModelSettingsStore()
const { confirm } = useConfirmDialog()
const { notify } = useNotification()

const views: Array<{ key: ModelsView; label: string }> = [
  { key: 'chat', label: 'Chat models' },
  { key: 'embeddings', label: 'Embeddings' },
  { key: 'summarizer', label: 'Summarizer' }
]

const activeView = ref<ModelsView>('chat')

await useAsyncData('settings-models', async () => {
  await Promise.all([
    settingsStore.fetchChatModels(),
    settingsStore.fetchEmbeddings(),
    settingsStore.fetchSummarizer()
  ])
  return true
})

async function saveEmbeddings(payload: EmbeddingsModelSettings) {
  let result = await settingsStore.updateEmbeddings(payload)
  if (result === 'needs-confirmation') {
    // the backend found indexed chunks the form did not know about
    const ok = await confirm(
      'Change the embedding model?',
      'Chunks indexed with the current model cannot be searched with another one, so the content of all your spaces will be deleted. The spaces stay.'
    )
    if (!ok) return
    result = await settingsStore.updateEmbeddings({ ...payload, resetDocuments: true })
  }
  if (result === 'saved') {
    notify({ type: NotificationType.INFO, message: 'Embedding model saved' })
  }
}
</script>

<template>
  <LayoutWrapper title="Settings">
    <div class="ui-segmented models-tabs" role="tablist" aria-label="Model type">
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
        @save="saveEmbeddings"
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

.models-tabs {
  @apply self-start max-sm:w-full max-sm:overflow-x-auto;
}
</style>
