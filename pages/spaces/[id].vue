<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useConfirmDialog } from '~/composables/useConfirmDialog'
import LayoutWrapper from '~/components/layout/LayoutWrapper.vue'

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirmDialog()
const spacesStore = useSpacesStore()
const ragStore = useRagStore()
const { loading } = storeToRefs(ragStore)

const spaceId = route.params.id as string
const space = computed(() => spacesStore.getById(spaceId))

const newText = ref('')
const batch = ref(true)
const uploading = ref(false)
const progress = ref(0)
const creating = ref(false)

await useAsyncData(`spaces-${spaceId}`, async () => {
  if (!spacesStore.spaces.length) await spacesStore.fetchSpaces(1000)
  return spacesStore.spaces
})
await useAsyncData(`documents-${spaceId}`, async () => {
  await ragStore.fetchDocuments(spaceId, 1000)
  return ragStore.getDocsBySpace(spaceId)
})

function goBack() {
  router.push({ name: 'spaces' })
}

async function addText() {
  if (!newText.value.trim() || uploading.value) return
  uploading.value = true
  progress.value = 0
  let lastFetchAt = 0
  try {
    await ragStore.addDocumentStream(
      spaceId,
      { text: newText.value.trim(), batch: batch.value },
      async (p: number) => {
        progress.value = p
        if (p - lastFetchAt >= 10) {
          await ragStore.fetchDocuments(spaceId, 1000)
          lastFetchAt = p
        }
      }
    )
    await ragStore.fetchDocuments(spaceId, 1000)
    newText.value = ''
    creating.value = false
  } finally {
    uploading.value = false
  }
}

async function deleteText(docId: string, chunkId: string) {
  const ok = await confirm('Remove text chunk', 'This action cannot be undone.')
  if (ok) await ragStore.deleteDocumentChunk(spaceId, docId, chunkId)
}

async function deleteDocument(docId: string) {
  const ok = await confirm('Remove entire document', 'This will delete all chunks.')
  if (ok) await ragStore.deleteDocument(spaceId, docId)
}

const palette = ['#34d399', '#60a5fa', '#f472b6', '#facc15', '#fb923c', '#a78bfa', '#4ade80']
const docColors = ref<Record<string, { label: string; color: string }>>({})

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i)
  return Math.abs(hash)
}

function getDocStyle(meta: RagDocumentMetadata) {
  const groupId = meta.doc
  if (!docColors.value[groupId]) {
    const hash = hashString(groupId)
    const index = hash % palette.length
    const label = `D${index + 1}`
    const color = palette[index] as string
    docColors.value[groupId] = { label, color }
  }
  return docColors.value[groupId]
}
</script>

<template>
  <LayoutWrapper :title="space?.name">
    <template #header-actions>
      <div class="flex items-center gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          icon="material-symbols:arrow-back"
          class="space__back"
          @click="goBack"
        />
        <UButton color="primary" variant="solid" size="sm" @click="creating = !creating">
          <Icon :name="creating ? 'material-symbols:close' : 'material-symbols:add'" class="mr-1" />
          {{ creating ? 'Cancel' : 'Add' }}
        </UButton>
      </div>
    </template>

    <transition name="slide-fade">
      <div v-if="creating" class="space__create">
        <textarea
          v-model="newText"
          rows="4"
          placeholder="Enter new data..."
          class="space__input"
          :disabled="uploading"
          @keyup.enter.exact="addText"
        />
        <div class="space__create-actions">
          <UButton
            color="primary"
            variant="solid"
            size="md"
            class="space__create__btn"
            icon="i-lucide-rocket"
            :loading="uploading || loading"
            @click="addText"
          >
            {{ uploading ? 'Uploading...' : 'Upload' }}
          </UButton>
          <UCheckbox
            v-if="!uploading"
            v-model="batch"
            label="Enable batching"
            class="space__batching"
          />
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="uploading" class="space__progress">
        <UProgress v-model="progress" :max="100" color="primary" size="md" />
        <p class="space__progress-text">{{ progress }}%</p>
      </div>
    </transition>

    <!-- ✅ Контейнер со скроллом -->
    <div class="space__scroll-container">
      <ul v-if="loading" class="space__list">
        <li v-for="n in 3" :key="n" class="space__item">
          <USkeleton class="h-5 w-48 animate-pulse rounded bg-gray-700/50" />
          <USkeleton class="h-5 w-6 animate-pulse rounded bg-gray-700/50" />
        </li>
      </ul>

      <ul v-else class="space__list">
        <li v-for="doc in ragStore.getDocsBySpace(spaceId)" :key="doc.id" class="space__item">
          <div class="space__doc-label">
            <span
              class="space__label"
              :style="{ backgroundColor: getDocStyle(doc.metadata).color }"
            >
              {{ getDocStyle(doc.metadata).label }}
            </span>
            <button
              class="space__delete-all"
              title="Delete all chunks"
              @click="deleteDocument(doc.metadata.doc)"
            >
              <Icon name="material-symbols:delete-forever-outline" />
            </button>
          </div>

          <span class="space__content">{{ doc.content }}</span>

          <div class="space__actions">
            <button
              class="space__delete"
              title="Delete chunk"
              @click="deleteText(doc.metadata.doc, doc.metadata.chunk)"
            >
              <Icon name="material-symbols:delete-outline" />
            </button>
          </div>
        </li>
      </ul>
    </div>
  </LayoutWrapper>
</template>

<style scoped>
@import 'tailwindcss/theme';

.space__scroll-container {
  @apply mt-4 flex-1 overflow-x-hidden overflow-y-auto;
  max-height: calc(100vh - 280px);
  padding-right: 0.25rem;
  scroll-behavior: smooth;
}

.space__list {
  @apply flex flex-col gap-2;
  overflow-x: hidden;
  max-width: 100%;
}

.space__item {
  @apply relative flex flex-col rounded-md bg-[#1e1e1e] p-4 transition-colors duration-200;
  overflow: hidden;
  box-sizing: border-box;
  max-width: 100%;
}
.space__item:hover {
  @apply bg-[#2a2a2a];
}

.space__content {
  @apply mt-9 flex-1 pr-8 text-sm leading-snug break-words whitespace-pre-wrap text-white;
  word-break: break-word;
  overflow-wrap: anywhere;
  max-width: 100%;
}

.space__doc-label {
  @apply absolute top-2 right-2 flex items-center gap-1;
}
.space__label {
  @apply rounded px-2 py-1 text-xs font-bold text-black;
}

.space__actions {
  @apply mt-2 flex justify-end;
}

.space__delete,
.space__delete-all {
  @apply cursor-pointer border-none bg-transparent p-1 text-xl text-gray-400 transition-colors duration-200;
}
.space__delete:hover {
  @apply text-red-500;
}
.space__delete-all:hover {
  @apply text-amber-500;
}

.space__create {
  @apply mb-5 flex flex-col gap-3 rounded-xl border border-[#333] bg-gradient-to-br from-[#1f1f1f] to-[#262626] p-5 shadow-md;
}
.space__input {
  @apply flex-1 resize-y rounded-md border border-[#333] bg-[#111] px-4 py-3 text-white transition-all duration-200 outline-none;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.space__input:focus {
  @apply border-blue-500 ring-2 ring-blue-500/30;
}
.space__create-actions {
  @apply flex flex-wrap items-center justify-between gap-2;
}
.space__batching {
  @apply text-sm text-gray-400;
}
.space__progress {
  @apply mb-4;
}
.space__progress-text {
  @apply mt-1 text-right text-xs text-gray-400;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  @apply transition-all duration-300 ease-in-out;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  @apply translate-y-3 opacity-0;
}
.fade-enter-active,
.fade-leave-active {
  @apply transition-opacity duration-300 ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  @apply opacity-0;
}
</style>
