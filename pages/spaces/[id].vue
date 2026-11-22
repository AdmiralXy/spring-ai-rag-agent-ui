<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useIntersectionObserver } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { useConfirmDialog } from '~/composables/useConfirmDialog'
import useNotification from '~/composables/useNotification'
import { NotificationType } from '~/types/notification'
import { SpaceUploadError } from '~/stores/useRagStore'
import type { ProviderOption, UploadProvider } from '~/types/spaceUpload'
import LayoutWrapper from '~/components/layout/LayoutWrapper.vue'
import SpaceProviderSelector from '~/components/spaces/SpaceProviderSelector.vue'
import SpaceConfluenceProvider from '~/components/spaces/providers/SpaceConfluenceProvider.vue'
import SpaceFilesProvider from '~/components/spaces/providers/SpaceFilesProvider.vue'
import SpaceGitProvider from '~/components/spaces/providers/SpaceGitProvider.vue'
import SpaceTextProvider from '~/components/spaces/providers/SpaceTextProvider.vue'

type PersistedAuthStorageKey = 'confluence' | 'git'

const route = useRoute()
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
  { value: 'text', label: 'Content', icon: 'lucide:text' },
  { value: 'files', label: 'Files', icon: 'lucide:upload' },
  { value: 'confluence', label: 'Confluence', icon: 'simple-icons:confluence' },
  { value: 'git', label: 'Git', icon: 'simple-icons:git' }
]

const palette = ['#30d158', '#409cff', '#ff6482', '#ffd60a', '#ff9f0a', '#bf5af2', '#64d2ff']

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
const scrollContainerRef = ref<HTMLElement | null>(null)
const loadMoreRef = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const activeSearchQuery = ref('')
const searchResults = ref<RagDocument[]>([])
const searchDepth = ref(5)

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
const searchDepthOptions = [
  { label: 'Top 5', value: 5 },
  { label: 'Top 10', value: 10 },
  { label: 'Top 20', value: 20 },
  { label: 'Top 40', value: 40 }
]

const isPlainTextProvider = computed(() => provider.value === 'text')
const isConfluenceProvider = computed(() => provider.value === 'confluence')
const isGitProvider = computed(() => provider.value === 'git')
const documents = computed(() => ragStore.getDocsBySpace(spaceId))
const documentsLoading = computed(() => ragStore.isDocumentsLoading(spaceId))
const documentsLoadingMore = computed(() => ragStore.isDocumentsLoadingMore(spaceId))
const documentsHasMore = computed(() => ragStore.hasMoreDocuments(spaceId))
const searchLoading = computed(() => ragStore.isSearchLoading(spaceId))
const isSearchMode = computed(() => Boolean(activeSearchQuery.value))
const visibleDocuments = computed(() =>
  isSearchMode.value ? searchResults.value : ragStore.getDocsBySpace(spaceId)
)
const loadedDocumentsCount = computed(() => documents.value.length)
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
  await ragStore.initializeDocuments(spaceId)
  return ragStore.getDocsBySpace(spaceId)
})

// The page itself scrolls: load the next page when the end of the list comes into view.
useIntersectionObserver(loadMoreRef, ([entry]) => {
  if (!entry?.isIntersecting || isSearchMode.value) return
  if (documentsLoading.value || documentsLoadingMore.value || !documentsHasMore.value) return
  void ragStore.loadMoreDocuments(spaceId)
})

async function onDocumentsScroll() {
  if (isSearchMode.value) return

  const container = scrollContainerRef.value
  if (
    !container ||
    documentsLoading.value ||
    documentsLoadingMore.value ||
    !documentsHasMore.value
  ) {
    return
  }

  const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight
  if (distanceToBottom <= 120) {
    await ragStore.loadMoreDocuments(spaceId)
  }
}

async function runSearch() {
  const query = searchQuery.value.trim()
  if (!query) {
    clearSearch()
    return
  }

  activeSearchQuery.value = query
  searchResults.value = []
  try {
    searchResults.value = await ragStore.searchDocuments(spaceId, query, searchDepth.value)
  } catch {
    searchResults.value = []
  }
}

function clearSearch() {
  searchQuery.value = ''
  activeSearchQuery.value = ''
  searchResults.value = []
  void nextTick().then(() => onDocumentsScroll())
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

onMounted(async () => {
  const confluenceAuth = loadPersistedAuth('confluence')
  const gitAuth = loadPersistedAuth('git')

  confluenceLogin.value = confluenceAuth.login
  confluencePassword.value = confluenceAuth.password
  gitLogin.value = gitAuth.login
  gitPassword.value = gitAuth.password

  authStorageReady.value = true

  await nextTick()
  await onDocumentsScroll()
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
        await ragStore.refreshDocuments(spaceId)
        lastFetchAt = p
      }
    })

    await ragStore.refreshDocuments(spaceId)
    resetCreateForm()
    creating.value = false
  } catch (err) {
    const failure = err instanceof SpaceUploadError ? err : null
    notify({
      type: NotificationType.ERROR,
      title: 'Content was not added',
      message:
        (failure?.message || 'Adding the content failed') +
        (failure?.partial ? '. Part of it was stored; delete it or add the rest again.' : ''),
      duration: 12000
    })
    if (failure?.partial) await ragStore.refreshDocuments(spaceId)
  } finally {
    uploading.value = false
  }
}

async function deleteText(docId: string, chunkId: string) {
  const ok = await confirm('Remove text chunk', 'This action cannot be undone.')
  if (ok) {
    await ragStore.deleteDocumentChunk(spaceId, docId, chunkId)
    searchResults.value = searchResults.value.filter((doc) => doc.metadata.chunk !== chunkId)
  }
}

async function deleteDocument(docId: string) {
  const ok = await confirm('Remove entire document', 'This will delete all chunks.')
  if (ok) {
    await ragStore.deleteDocument(spaceId, docId)
    searchResults.value = searchResults.value.filter((doc) => doc.metadata.doc !== docId)
  }
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

watch(
  () => documents.value.length,
  async () => {
    if (isSearchMode.value) return
    await nextTick()
    await onDocumentsScroll()
  }
)
</script>

<template>
  <LayoutWrapper :title="space?.name" subtitle="Space">
    <template #header-leading>
      <NuxtLink to="/spaces" class="space__back" aria-label="Back to spaces">
        <Icon name="lucide:chevron-left" />
        Spaces
      </NuxtLink>
    </template>
    <template #header-actions>
      <button
        type="button"
        class="ui-btn"
        :class="creating ? 'ui-btn--secondary' : 'ui-btn--primary'"
        @click="toggleCreate"
      >
        <Icon :name="creating ? 'lucide:x' : 'lucide:plus'" />
        {{ creating ? 'Cancel' : 'Add content' }}
      </button>
    </template>

    <section v-show="creating" class="ui-card space__create" aria-label="Add content">
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

      <div v-show="uploading" class="space__progress">
        <div class="space__progress-track">
          <div class="space__progress-bar" :style="{ width: `${progress}%` }" />
        </div>
        <span class="space__progress-text">{{ progress }}%</span>
      </div>

      <div class="space__create-actions">
        <label v-if="!uploading" class="space__batching">
          <button
            type="button"
            role="switch"
            class="ui-switch"
            aria-label="Batch embeddings"
            :aria-checked="batch"
            @click="batch = !batch"
          ></button>
          <span>Batch embeddings</span>
        </label>
        <div class="flex-1"></div>
        <button
          type="button"
          class="ui-btn ui-btn--primary ui-btn--lg"
          :disabled="!canUpload"
          @click="addContent"
        >
          <Icon v-if="uploading || loading" name="lucide:loader-circle" class="animate-spin" />
          <Icon v-else name="lucide:upload" />
          {{ uploading ? 'Uploading…' : 'Add to space' }}
        </button>
      </div>
    </section>

    <section class="space__search" aria-label="Semantic search">
      <form class="space__search-bar" role="search" @submit.prevent="runSearch">
        <Icon name="lucide:search" class="space__search-icon" />
        <label for="space-search" class="ui-sr-only">Search this space</label>
        <input
          id="space-search"
          v-model="searchQuery"
          type="search"
          class="space__search-input"
          placeholder="Search by meaning, topic or phrase"
        />
        <label for="space-depth" class="ui-sr-only">Number of results</label>
        <select id="space-depth" v-model.number="searchDepth" class="space__depth">
          <option v-for="option in searchDepthOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <button
          v-if="isSearchMode"
          type="button"
          class="ui-icon-btn"
          aria-label="Clear search"
          @click="clearSearch"
        >
          <Icon name="lucide:x" />
        </button>
        <button
          type="submit"
          class="ui-btn ui-btn--primary ui-btn--sm"
          :disabled="!searchQuery.trim() || searchLoading"
        >
          <Icon v-if="searchLoading" name="lucide:loader-circle" class="animate-spin" />
          Search
        </button>
      </form>
      <p class="ui-hint">
        <template v-if="isSearchMode">
          {{ searchResults.length }} closest chunks for “{{ activeSearchQuery }}”
        </template>
        <template v-else-if="loadedDocumentsCount">
          {{ loadedDocumentsCount }} chunks loaded{{ documentsHasMore ? ', scroll for more' : '' }}
        </template>
      </p>
    </section>

    <div ref="scrollContainerRef" class="space__scroll" @scroll.passive="onDocumentsScroll">
      <div
        v-if="
          (documentsLoading && !loadedDocumentsCount && !isSearchMode) ||
          (searchLoading && isSearchMode && !searchResults.length)
        "
        class="space__list"
      >
        <div v-for="n in 3" :key="n" class="ui-card space__chunk">
          <USkeleton class="h-4 w-48 rounded" />
          <USkeleton class="h-14 w-full rounded" />
        </div>
      </div>

      <div v-else-if="!visibleDocuments.length" class="ui-empty">
        <Icon
          :name="isSearchMode ? 'lucide:search-x' : 'lucide:file-text'"
          class="ui-empty__icon"
        />
        <p class="ui-empty__title">
          {{ isSearchMode ? 'Nothing matched' : 'This space is empty' }}
        </p>
        <p class="text-sm">
          {{
            isSearchMode
              ? 'Try a broader query or return more results.'
              : 'Add text, files, Confluence pages or a Git repository to build the knowledge base.'
          }}
        </p>
      </div>

      <div v-else class="space__list">
        <article v-for="doc in visibleDocuments" :key="doc.id" class="ui-card space__chunk">
          <div class="space__chunk-head">
            <span class="space__label" :style="{ '--doc-color': getDocStyle(doc.metadata).color }">
              {{ getDocStyle(doc.metadata).label }}
            </span>
            <span class="space__source" :title="doc.metadata.doc">{{ doc.metadata.doc }}</span>
            <span
              v-if="isSearchMode && doc.metadata.distance !== undefined"
              class="ui-chip ui-chip--accent"
              title="Cosine distance, lower is closer"
            >
              {{ doc.metadata.distance.toFixed(3) }}
            </span>
            <button
              type="button"
              class="ui-icon-btn ui-icon-btn--danger"
              title="Delete this chunk"
              aria-label="Delete this chunk"
              @click="deleteText(doc.metadata.doc, doc.metadata.chunk)"
            >
              <Icon name="lucide:trash-2" />
            </button>
            <button
              type="button"
              class="ui-icon-btn ui-icon-btn--danger"
              title="Delete the whole document"
              aria-label="Delete the whole document"
              @click="deleteDocument(doc.metadata.doc)"
            >
              <Icon name="lucide:file-x" />
            </button>
          </div>
          <p class="space__content">{{ doc.content }}</p>
        </article>

        <div ref="loadMoreRef" aria-hidden="true"></div>
        <p v-if="documentsLoadingMore && !isSearchMode" class="space__status">Loading more…</p>
        <p v-else-if="!documentsHasMore && !isSearchMode" class="space__status">
          All chunks are loaded
        </p>
      </div>
    </div>
  </LayoutWrapper>
</template>

<style scoped>
@import 'tailwindcss/theme';

.space__back {
  @apply -ml-1 flex w-full items-center gap-0.5 text-sm;
  color: var(--c-accent);
}

.space__back:hover {
  color: var(--c-accent-hover);
}

.space__create {
  @apply flex flex-col gap-4 p-4;
}

.space__create-actions {
  @apply flex flex-wrap items-center gap-3;
}

.space__batching {
  @apply flex cursor-pointer items-center gap-2.5 text-sm;
  color: var(--c-text-2);
}

.space__progress {
  @apply flex items-center gap-3;
}

.space__progress-track {
  @apply h-1.5 flex-1 overflow-hidden rounded-full;
  background: var(--c-surface-3);
}

.space__progress-bar {
  @apply h-full rounded-full transition-[width] duration-200;
  background: var(--c-accent);
}

.space__progress-text {
  @apply w-10 text-right text-xs tabular-nums;
  color: var(--c-text-4);
}

.space__search {
  @apply flex flex-col gap-2;
}

.space__search-bar {
  @apply flex h-12 items-center gap-2 pr-1.5 pl-3.5;
  border-radius: var(--r-lg);
  background: var(--c-surface-2);
  border: 1px solid var(--c-sep);
}

.space__search-bar:focus-within {
  border-color: var(--c-accent-ring);
  box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.18);
}

.space__search-icon {
  @apply flex-none text-base;
  color: var(--c-text-4);
}

.space__search-input {
  @apply min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none;
  color: var(--c-text);
}

.space__search-input::placeholder {
  color: var(--c-text-4);
}

.space__search-input::-webkit-search-cancel-button {
  display: none;
}

.space__depth {
  @apply h-[30px] cursor-pointer appearance-none rounded-full border-0 px-3 text-[13px] outline-none max-sm:hidden;
  background: var(--c-surface-3);
  color: var(--c-text-2);
}

.space__scroll {
  @apply flex flex-col;
}

.space__list {
  @apply flex flex-col gap-2.5;
}

.space__chunk {
  @apply flex flex-col gap-2.5 p-4;
}

.space__chunk-head {
  @apply flex min-w-0 items-center gap-2;
}

.space__label {
  @apply inline-flex h-[22px] flex-none items-center rounded-full px-2 text-[11px] font-semibold;
  background: color-mix(in srgb, var(--doc-color) 18%, transparent);
  color: var(--doc-color);
}

.space__source {
  @apply min-w-0 flex-1 truncate text-xs;
  font-family: var(--font-mono);
  color: var(--c-text-4);
}

.space__content {
  @apply m-0 text-sm leading-relaxed break-words whitespace-pre-wrap;
  color: var(--c-text-2);
  overflow-wrap: anywhere;
}

.space__status {
  @apply py-3 text-center text-xs;
  color: var(--c-text-4);
}
</style>
