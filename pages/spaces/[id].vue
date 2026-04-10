<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useConfirmDialog } from '~/composables/useConfirmDialog'
import useNotification from '~/composables/useNotification'
import { NotificationType } from '~/types/notification'
import LayoutWrapper from '~/components/layout/LayoutWrapper.vue'
import SpaceFileDropzone from '~/components/spaces/SpaceFileDropzone.vue'
import SpaceProviderSelector from '~/components/spaces/SpaceProviderSelector.vue'

type UploadProvider = 'text' | 'files' | 'confluence'

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirmDialog()
const { notify } = useNotification()
const spacesStore = useSpacesStore()
const ragStore = useRagStore()
const { loading } = storeToRefs(ragStore)

const spaceId = route.params.id as string
const space = computed(() => spacesStore.getById(spaceId))

const newText = ref('')
const provider = ref<UploadProvider>('text')
const files = ref<File[]>([])
const batch = ref(true)
const uploading = ref(false)
const progress = ref(0)
const creating = ref(false)

const isTextInputProvider = computed(() => provider.value !== 'files')

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

function toggleCreate() {
  creating.value = !creating.value
  if (!creating.value) resetCreateForm()
}

async function readFilesAsText(selectedFiles: File[]) {
  const parts = await Promise.all(
    selectedFiles.map(async (file) => {
      const content = await file.text()
      const normalizedContent = content.trim()
      return [`File: ${file.name}`, normalizedContent].filter(Boolean).join('\n')
    })
  )

  return parts.filter(Boolean).join('\n\n')
}

function resetCreateForm() {
  newText.value = ''
  files.value = []
  provider.value = 'text'
  batch.value = true
}

async function buildUploadPayload(): Promise<AddToSpaceRq | null> {
  if (provider.value === 'files') {
    if (!files.value.length) return null

    try {
      const text = await readFilesAsText(files.value)
      if (!text.trim()) return null

      return {
        text,
        batch: batch.value,
        providerType: 'text'
      }
    } catch {
      notify({
        type: NotificationType.ERROR,
        message: 'Не удалось прочитать выбранные файлы'
      })
      return null
    }
  }

  if (!newText.value.trim()) return null

  return {
    text: newText.value.trim(),
    batch: batch.value,
    providerType: provider.value === 'confluence' ? 'confluence' : 'text'
  }
}

async function addContent() {
  if (uploading.value) return

  const payload = await buildUploadPayload()
  if (!payload) return

  uploading.value = true
  progress.value = 0
  let lastFetchAt = 0
  try {
    await ragStore.addDocumentStream(
      spaceId,
      payload,
      async (p: number) => {
        progress.value = p
        if (p - lastFetchAt >= 10) {
          await ragStore.fetchDocuments(spaceId, 1000)
          lastFetchAt = p
        }
      }
    )
    await ragStore.fetchDocuments(spaceId, 1000)
    resetCreateForm()
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
        <UButton color="primary" variant="solid" size="sm" @click="toggleCreate">
          <Icon :name="creating ? 'material-symbols:close' : 'material-symbols:add'" class="mr-1" />
          {{ creating ? 'Cancel' : 'Add' }}
        </UButton>
      </div>
    </template>

    <transition name="slide-fade">
      <div v-if="creating" class="space__create">
        <SpaceProviderSelector v-model="provider" :disabled="uploading" />

        <textarea
          v-if="isTextInputProvider"
          v-model="newText"
          rows="4"
          placeholder="Inspiration is a guest that does not willingly visit the lazy..."
          class="space__input"
          :disabled="uploading"
          @keyup.enter.exact="addContent"
        />

        <SpaceFileDropzone v-else v-model="files" :disabled="uploading" />

        <div class="space__create-actions">
          <UButton
            color="primary"
            variant="solid"
            size="md"
            class="space__create__btn"
            icon="i-lucide-rocket"
            :loading="uploading || loading"
            @click="addContent"
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
  min-height: 7.5rem;
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
