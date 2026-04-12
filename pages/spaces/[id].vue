<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useConfirmDialog } from '~/composables/useConfirmDialog'
import useNotification from '~/composables/useNotification'
import { NotificationType } from '~/types/notification'
import type { ProviderOption, UploadProvider } from '~/types/spaceUpload'
import LayoutWrapper from '~/components/layout/LayoutWrapper.vue'
import SpaceProviderSelector from '~/components/spaces/SpaceProviderSelector.vue'
import SpaceConfluenceProvider from '~/components/spaces/providers/SpaceConfluenceProvider.vue'
import SpaceFilesProvider from '~/components/spaces/providers/SpaceFilesProvider.vue'
import SpaceGitProvider from '~/components/spaces/providers/SpaceGitProvider.vue'
import SpaceTextProvider from '~/components/spaces/providers/SpaceTextProvider.vue'

type PersistedAuthStorageKey = 'confluence' | 'git'

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirmDialog()
const { notify } = useNotification()
const config = useRuntimeConfig()
const api = useApi()
const spacesStore = useSpacesStore()
const ragStore = useRagStore()
const { loading } = storeToRefs(ragStore)

const AUTH_STORAGE_KEYS: Record<PersistedAuthStorageKey, string> = {
  confluence: 'space-upload-auth:confluence',
  git: 'space-upload-auth:git'
}

const providerOptions: ProviderOption[] = [
  { value: 'text', label: 'Content', icon: 'material-symbols:text-snippet-outline-rounded' },
  { value: 'files', label: 'Files', icon: 'material-symbols:upload-file-outline-rounded' },
  { value: 'confluence', label: 'Confluence', icon: 'simple-icons:confluence' },
  { value: 'git', label: 'Git', icon: 'mdi:git' }
]

const palette = ['#34d399', '#60a5fa', '#f472b6', '#facc15', '#fb923c', '#a78bfa', '#4ade80']

const spaceId = route.params.id as string
const space = computed(() => spacesStore.getById(spaceId))

const newText = ref('')
const confluenceUrl = ref('')
const confluenceLogin = ref('')
const confluencePassword = ref('')
const gitUrl = ref('')
const gitBranch = ref('')
const gitFolder = ref('')
const gitLogin = ref('')
const gitPassword = ref('')
const gitBranches = ref<string[]>([])
const gitFolders = ref<string[]>([])
const gitInfoLoading = ref(false)
const gitInfoLoaded = ref(false)
const gitInfoError = ref('')
const gitInfoSummary = ref('')
const authStorageReady = ref(false)
const provider = ref<UploadProvider>('text')
const files = ref<File[]>([])
const batch = ref(true)
const uploading = ref(false)
const progress = ref(0)
const creating = ref(false)
const docColors = ref<Record<string, { label: string; color: string }>>({})

const availableProviders = computed<UploadProvider[]>(() => {
  const raw = String(config.public.spaceUploadProviders ?? '').trim()
  if (!raw) {
    return providerOptions.map((option) => option.value)
  }

  const allowed = new Set(providerOptions.map((option) => option.value))
  const parsed = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is UploadProvider => allowed.has(item as UploadProvider))

  return parsed.length ? parsed : providerOptions.map((option) => option.value)
})

const availableProviderOptions = computed(() =>
  providerOptions.filter((option) => availableProviders.value.includes(option.value))
)

const isPlainTextProvider = computed(() => provider.value === 'text')
const isConfluenceProvider = computed(() => provider.value === 'confluence')
const isGitProvider = computed(() => provider.value === 'git')
const canLoadGitInfo = computed(() => {
  if (!gitUrl.value.trim()) return false
  if (hasPartialAuth(gitLogin.value, gitPassword.value)) return false
  return !uploading.value
})
const canUpload = computed(() => {
  if (uploading.value || loading.value) return false

  if (provider.value === 'files') return files.value.length > 0
  if (provider.value === 'text') return Boolean(newText.value.trim())

  if (provider.value === 'confluence') {
    return (
      Boolean(confluenceUrl.value.trim()) &&
      hasLogin(confluenceLogin.value) &&
      hasPassword(confluencePassword.value)
    )
  }

  return Boolean(gitUrl.value.trim()) && gitInfoLoaded.value && Boolean(gitBranch.value.trim())
})

watch(
  availableProviders,
  (providers) => {
    if (providers.includes(provider.value)) return
    provider.value = providers[0] ?? 'text'
  },
  { immediate: true }
)

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

function hasLogin(value: string) {
  return value.trim().length > 0
}

function hasPassword(value: string) {
  return value.length > 0
}

function hasPartialAuth(login: string, password: string) {
  const hasAny = hasLogin(login) || hasPassword(password)
  const hasBoth = hasLogin(login) && hasPassword(password)
  return hasAny && !hasBoth
}

function clearGitInfoState(options: { preserveSelection?: boolean } = {}) {
  const { preserveSelection = false } = options
  gitBranches.value = []
  gitFolders.value = []
  gitInfoLoading.value = false
  gitInfoLoaded.value = false
  gitInfoError.value = ''
  gitInfoSummary.value = ''

  if (!preserveSelection) {
    gitBranch.value = ''
    gitFolder.value = ''
  }
}

function clearGitFolder() {
  gitFolder.value = ''
}

function loadPersistedAuth(key: PersistedAuthStorageKey) {
  if (!import.meta.client) {
    return { login: '', password: '' }
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEYS[key])
    if (!raw) return { login: '', password: '' }

    const parsed = JSON.parse(raw) as Partial<ProviderAuth>
    return {
      login: typeof parsed.login === 'string' ? parsed.login : '',
      password: typeof parsed.password === 'string' ? parsed.password : ''
    }
  } catch {
    return { login: '', password: '' }
  }
}

function persistAuth(key: PersistedAuthStorageKey, auth: ProviderAuth) {
  if (!import.meta.client || !authStorageReady.value) return

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEYS[key], JSON.stringify(auth))
  } catch {
    // Ignore storage failures and keep the form usable.
  }
}

function normalizeGitItems(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))]
}

async function loadGitInfo() {
  if (!gitUrl.value.trim()) {
    notify({
      type: NotificationType.ERROR,
      message: 'Enter a Git repository URL first'
    })
    return
  }

  if (hasPartialAuth(gitLogin.value, gitPassword.value)) {
    notify({
      type: NotificationType.ERROR,
      message: 'Fill both Git login and password or leave both empty'
    })
    return
  }

  gitInfoLoading.value = true
  gitInfoError.value = ''
  gitInfoSummary.value = ''

  try {
    const res = await api.post<GitInfoRs>('/git/info', {
      url: gitUrl.value.trim(),
      login: hasLogin(gitLogin.value) ? gitLogin.value.trim() : undefined,
      password: hasPassword(gitPassword.value) ? gitPassword.value : undefined
    } satisfies GitInfoRq)

    const branches = normalizeGitItems(res.branches ?? [])
    const folders = normalizeGitItems(res.folders ?? [])

    gitBranches.value = branches
    gitFolders.value = folders
    gitInfoLoaded.value = true
    gitBranch.value = branches.includes(gitBranch.value) ? gitBranch.value : (branches[0] ?? '')
    gitFolder.value = folders.includes(gitFolder.value) ? gitFolder.value : ''

    if (!branches.length) {
      gitInfoError.value = 'Repository info loaded, but the backend returned no branches'
      return
    }

    const branchLabel = `${branches.length} branch${branches.length === 1 ? '' : 'es'}`
    const folderLabel = `${folders.length} folder${folders.length === 1 ? '' : 's'}`
    gitInfoSummary.value = folders.length
      ? `Loaded ${branchLabel} and ${folderLabel}`
      : `Loaded ${branchLabel}. Folder is optional and can stay empty`
  } catch {
    clearGitInfoState()
    gitInfoError.value = 'Failed to load repository info'
  } finally {
    gitInfoLoading.value = false
  }
}

onMounted(() => {
  const confluenceAuth = loadPersistedAuth('confluence')
  const gitAuth = loadPersistedAuth('git')

  confluenceLogin.value = confluenceAuth.login
  confluencePassword.value = confluenceAuth.password
  gitLogin.value = gitAuth.login
  gitPassword.value = gitAuth.password

  authStorageReady.value = true
})

watch([confluenceLogin, confluencePassword], ([login, password]) => {
  persistAuth('confluence', { login, password })
})

watch([gitLogin, gitPassword], ([login, password]) => {
  persistAuth('git', { login, password })
})

watch([gitUrl, gitLogin, gitPassword], (next, prev) => {
  if (!prev) return
  if (next.every((value, index) => value === prev[index])) return
  clearGitInfoState()
})

function resetCreateForm() {
  newText.value = ''
  confluenceUrl.value = ''
  gitUrl.value = ''
  clearGitInfoState()
  files.value = []
  provider.value = availableProviders.value[0] ?? 'text'
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
        message: 'Failed to read the selected files'
      })
      return null
    }
  }

  if (provider.value === 'confluence') {
    if (!confluenceUrl.value.trim()) {
      notify({
        type: NotificationType.ERROR,
        message: 'Enter a Confluence URL'
      })
      return null
    }

    if (!hasLogin(confluenceLogin.value) || !hasPassword(confluencePassword.value)) {
      notify({
        type: NotificationType.ERROR,
        message: 'Confluence login and password are required'
      })
      return null
    }

    return {
      text: confluenceUrl.value.trim(),
      batch: batch.value,
      providerType: 'confluence',
      auth: {
        login: confluenceLogin.value.trim(),
        password: confluencePassword.value
      }
    }
  }

  if (provider.value === 'git') {
    if (!gitUrl.value.trim()) {
      notify({
        type: NotificationType.ERROR,
        message: 'Enter a Git repository URL'
      })
      return null
    }

    if (hasPartialAuth(gitLogin.value, gitPassword.value)) {
      notify({
        type: NotificationType.ERROR,
        message: 'Fill both Git login and password or leave both empty'
      })
      return null
    }

    if (!gitInfoLoaded.value) {
      notify({
        type: NotificationType.ERROR,
        message: 'Load repository branches before uploading'
      })
      return null
    }

    if (!gitBranch.value.trim()) {
      notify({
        type: NotificationType.ERROR,
        message: 'Select a Git branch'
      })
      return null
    }

    return {
      text: gitUrl.value.trim(),
      batch: batch.value,
      providerType: 'git',
      git: {
        branch: gitBranch.value.trim(),
        folder: gitFolder.value
      },
      auth:
        hasLogin(gitLogin.value) && hasPassword(gitPassword.value)
          ? {
              login: gitLogin.value.trim(),
              password: gitPassword.value
            }
          : undefined
    }
  }

  if (!newText.value.trim()) return null

  return {
    text: newText.value.trim(),
    batch: batch.value,
    providerType: 'text'
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
    await ragStore.addDocumentStream(spaceId, payload, async (p: number) => {
      progress.value = p
      if (p - lastFetchAt >= 10) {
        await ragStore.fetchDocuments(spaceId, 1000)
        lastFetchAt = p
      }
    })

    await ragStore.fetchDocuments(spaceId, 1000)
    resetCreateForm()
    creating.value = false
  } catch {
    notify({
      type: NotificationType.ERROR,
      message: 'Failed to upload content'
    })
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
        <SpaceProviderSelector
          v-model="provider"
          :items="availableProviderOptions"
          :disabled="uploading"
        />

        <SpaceTextProvider
          v-if="isPlainTextProvider"
          v-model="newText"
          :disabled="uploading"
          @submit="addContent"
        />

        <SpaceConfluenceProvider
          v-else-if="isConfluenceProvider"
          :url="confluenceUrl"
          :login="confluenceLogin"
          :password="confluencePassword"
          :disabled="uploading"
          @update:url="confluenceUrl = $event"
          @update:login="confluenceLogin = $event"
          @update:password="confluencePassword = $event"
          @submit="addContent"
        />

        <SpaceGitProvider
          v-else-if="isGitProvider"
          :url="gitUrl"
          :branch="gitBranch"
          :folder="gitFolder"
          :login="gitLogin"
          :password="gitPassword"
          :branches="gitBranches"
          :folders="gitFolders"
          :info-loading="gitInfoLoading"
          :info-loaded="gitInfoLoaded"
          :info-error="gitInfoError"
          :info-summary="gitInfoSummary"
          :disabled="uploading"
          :can-load-info="canLoadGitInfo"
          @update:url="gitUrl = $event"
          @update:branch="gitBranch = $event"
          @update:folder="gitFolder = $event"
          @update:login="gitLogin = $event"
          @update:password="gitPassword = $event"
          @load-info="loadGitInfo"
          @clear-folder="clearGitFolder"
        />

        <SpaceFilesProvider v-else v-model="files" :disabled="uploading" />

        <div class="space__create-actions">
          <UButton
            color="primary"
            variant="solid"
            size="md"
            class="space__create__btn"
            icon="i-lucide-rocket"
            :loading="uploading || loading"
            :disabled="!canUpload"
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
  @apply flex max-w-full flex-col gap-2;
  overflow-x: hidden;
}

.space__item {
  @apply relative flex max-w-full flex-col overflow-hidden rounded-md bg-[#1e1e1e] p-4 transition-colors duration-200;
  box-sizing: border-box;
}

.space__item:hover {
  @apply bg-[#2a2a2a];
}

.space__content {
  @apply mt-9 flex-1 pr-8 text-sm leading-snug break-words whitespace-pre-wrap text-white;
  overflow-wrap: anywhere;
  word-break: break-word;
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
