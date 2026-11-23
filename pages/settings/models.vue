<script setup lang="ts">
import { computed, ref } from 'vue'
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

// a section shows skeletons until its settings have been loaded once
const viewLoaded = computed(
  () =>
    ({
      chat: settingsStore.loadedChat,
      embeddings: settingsStore.loadedEmbeddings,
      summarizer: settingsStore.loadedSummarizer
    })[activeView.value]
)

useLazyAsyncData('settings-models', async () => {
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
      <div
        v-if="!viewLoaded"
        class="models-skeleton"
        aria-busy="true"
        aria-label="Loading settings"
      >
        <template v-if="activeView === 'chat'">
          <USkeleton class="h-3 w-24 rounded" />
          <div class="ui-group">
            <div v-for="n in 3" :key="n" class="ui-group-row models-skeleton__row">
              <USkeleton class="h-9 w-9 flex-none rounded-[9px]" />
              <div class="flex flex-1 flex-col gap-1.5">
                <USkeleton class="h-4 w-40 max-w-full rounded" />
                <USkeleton class="h-3 w-56 max-w-full rounded" />
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <template v-for="n in 2" :key="n">
            <USkeleton class="h-3 w-20 rounded" />
            <div class="ui-group">
              <div v-for="r in 3" :key="r" class="ui-group-row models-skeleton__row">
                <USkeleton class="h-4 w-28 flex-none rounded" />
                <div class="flex-1" />
                <USkeleton class="h-4 w-44 max-w-[45%] rounded" />
              </div>
            </div>
          </template>
        </template>
      </div>

      <ChatModelsSection
        v-else-if="activeView === 'chat'"
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

      <template #fallback>
        <div class="models-skeleton" aria-busy="true" aria-label="Loading settings">
          <USkeleton class="h-3 w-24 rounded" />
          <div class="ui-group">
            <div v-for="n in 3" :key="n" class="ui-group-row models-skeleton__row">
              <USkeleton class="h-9 w-9 flex-none rounded-[9px]" />
              <div class="flex flex-1 flex-col gap-1.5">
                <USkeleton class="h-4 w-40 max-w-full rounded" />
                <USkeleton class="h-3 w-56 max-w-full rounded" />
              </div>
            </div>
          </div>
        </div>
      </template>
    </ClientOnly>
  </LayoutWrapper>
</template>

<style scoped>
@import 'tailwindcss/theme';

.models-skeleton {
  @apply flex max-w-[520px] flex-col gap-2;
}

.models-skeleton > .ui-group + :deep(*) {
  @apply mt-4;
}

.models-skeleton__row {
  @apply min-h-[56px] gap-3;
}

.models-tabs {
  @apply self-start max-sm:w-full max-sm:overflow-x-auto;
}
</style>
