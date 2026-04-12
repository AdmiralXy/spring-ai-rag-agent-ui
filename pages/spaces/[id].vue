<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useConfirmDialog } from '~/composables/useConfirmDialog'
import useNotification from '~/composables/useNotification'
import { NotificationType } from '~/types/notification'
import LayoutWrapper from '~/components/layout/LayoutWrapper.vue'
import SpaceFileDropzone from '~/components/spaces/SpaceFileDropzone.vue'
import SpaceProviderSelector from '~/components/spaces/SpaceProviderSelector.vue'

type UploadProvider = 'text' | 'files' | 'confluence' | 'git'
type ProviderOption = {
  value: UploadProvider
  label: string
  icon: string
}
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

const providerOptions: ProviderOption[] = [
  { value: 'text', label: 'Content', icon: 'material-symbols:text-snippet-outline-rounded' },
  { value: 'files', label: 'Files', icon: 'material-symbols:upload-file-outline-rounded' },
  { value: 'confluence', label: 'Confluence', icon: 'simple-icons:confluence' },
  { value: 'git', label: 'Git', icon: 'mdi:git' }
]

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
const hasGitFolders = computed(() => gitFolders.value.length > 0)
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
        <SpaceProviderSelector
          v-model="provider"
          :items="availableProviderOptions"
          :disabled="uploading"
        />

        <textarea
          v-if="isPlainTextProvider"
          v-model="newText"
          rows="4"
          placeholder="Inspiration is a guest that does not willingly visit the lazy..."
          class="space__input"
          :disabled="uploading"
          @keyup.enter.exact="addContent"
        />

        <div v-else-if="isConfluenceProvider" class="space__provider-panel">
          <label class="space__compact-field">
            <span class="space__compact-icon">
              <Icon name="simple-icons:confluence" />
            </span>
            <input
              v-model="confluenceUrl"
              type="url"
              placeholder="https://confluence.example.com/..."
              class="space__compact-input"
              :disabled="uploading"
              @keyup.enter.exact="addContent"
            />
          </label>

          <div class="space__auth-card">
            <div class="space__section-copy">
              <p class="space__section-title">Authentication</p>
            </div>

            <div class="space__field-grid">
              <label class="space__field">
                <span class="space__field-label">Login</span>
                <input
                  v-model="confluenceLogin"
                  type="text"
                  autocomplete="username"
                  placeholder="Username"
                  class="space__field-input"
                  :disabled="uploading"
                  @keyup.enter.exact="addContent"
                />
              </label>

              <label class="space__field">
                <span class="space__field-label">Password</span>
                <input
                  v-model="confluencePassword"
                  type="password"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="space__field-input"
                  :disabled="uploading"
                  @keyup.enter.exact="addContent"
                />
              </label>
            </div>
          </div>
        </div>

        <div v-else-if="isGitProvider" class="space__provider-panel">
          <label class="space__compact-field">
            <span class="space__compact-icon space__compact-icon--git">
              <Icon name="mdi:git" />
            </span>
            <input
              v-model="gitUrl"
              type="url"
              placeholder="https://github.com/org/repo.git"
              class="space__compact-input"
              :disabled="uploading"
              @keyup.enter.exact="loadGitInfo"
            />
          </label>

          <div class="space__auth-card space__auth-card--optional">
            <div class="space__section-copy">
              <p class="space__section-title">Authentication</p>
              <p class="space__section-note">Optional for public repositories.</p>
            </div>

            <div class="space__field-grid">
              <label class="space__field">
                <span class="space__field-label">Login</span>
                <input
                  v-model="gitLogin"
                  type="text"
                  autocomplete="username"
                  placeholder="Username"
                  class="space__field-input"
                  :disabled="uploading"
                  @keyup.enter.exact="loadGitInfo"
                />
              </label>

              <label class="space__field">
                <span class="space__field-label">Password</span>
                <input
                  v-model="gitPassword"
                  type="password"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="space__field-input"
                  :disabled="uploading"
                  @keyup.enter.exact="loadGitInfo"
                />
              </label>
            </div>
          </div>

          <div class="space__git-toolbar">
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              icon="mdi:source-branch"
              :loading="gitInfoLoading"
              :disabled="!canLoadGitInfo"
              @click="loadGitInfo"
            >
              {{ gitInfoLoading ? 'Loading repository...' : 'Load branches and folders' }}
            </UButton>

            <p v-if="gitInfoSummary" class="space__section-note">{{ gitInfoSummary }}</p>
            <p v-else-if="gitInfoError" class="space__status space__status--error">
              {{ gitInfoError }}
            </p>
          </div>

          <div class="space__git-grid">
            <label class="space__field">
              <span class="space__field-label">Branch</span>
              <select
                v-model="gitBranch"
                class="space__field-input space__select"
                :disabled="uploading || gitInfoLoading || !gitBranches.length"
              >
                <option value="" disabled>
                  {{
                    gitInfoLoading
                      ? 'Loading branches...'
                      : gitBranches.length
                        ? 'Select branch'
                        : 'Load repository info first'
                  }}
                </option>
                <option v-for="branch in gitBranches" :key="branch" :value="branch">
                  {{ branch }}
                </option>
              </select>
            </label>

            <div class="space__folder-field">
              <label class="space__field">
                <span class="space__field-label">Folder</span>
                <select
                  v-model="gitFolder"
                  class="space__field-input space__select"
                  :disabled="uploading || gitInfoLoading || !gitInfoLoaded"
                >
                  <option value="">Repository root</option>
                  <option v-for="folder in gitFolders" :key="folder" :value="folder">
                    {{ folder }}
                  </option>
                </select>
              </label>

              <UButton
                v-if="gitFolder"
                color="neutral"
                variant="ghost"
                size="xs"
                icon="material-symbols:close-small"
                class="space__folder-clear"
                :disabled="uploading || gitInfoLoading"
                @click="clearGitFolder"
              >
                Clear
              </UButton>
            </div>
          </div>

          <p v-if="gitInfoLoaded && !hasGitFolders" class="space__section-note">
            Folder is optional. If you leave it empty, the backend will use the repository root.
          </p>
        </div>

        <SpaceFileDropzone v-else v-model="files" :disabled="uploading" />

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
.space__provider-panel {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.space__input {
  min-height: 7.5rem;
  @apply flex-1 resize-y rounded-md border border-[#333] bg-[#111] px-4 py-3 text-white transition-all duration-200 outline-none;
  overflow-wrap: anywhere;
  word-break: break-word;
  border-radius: 1rem;
}
.space__input:focus {
  @apply border-blue-500 ring-2 ring-blue-500/30;
}
.space__compact-field {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  width: 100%;
  border: 1px solid #333;
  border-radius: 1rem;
  background: linear-gradient(180deg, #141414 0%, #101010 100%);
  padding: 0.5rem 0.75rem;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.space__compact-field:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.18);
}
.space__compact-icon {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.14);
  color: #93c5fd;
  flex-shrink: 0;
}
.space__compact-icon--git {
  background: rgba(249, 115, 22, 0.14);
  color: #fdba74;
}
.space__compact-input {
  width: 100%;
  border: none;
  background: transparent;
  color: #fff;
  outline: none;
  font-size: 0.95rem;
}
.space__compact-input::placeholder {
  color: #6b7280;
}
.space__auth-card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  border: 1px solid rgba(59, 130, 246, 0.14);
  border-radius: 1rem;
  background: linear-gradient(180deg, rgba(20, 20, 20, 0.96) 0%, rgba(14, 14, 14, 0.98) 100%);
  padding: 1rem;
}
.space__auth-card--optional {
  border-color: rgba(249, 115, 22, 0.14);
}
.space__section-copy {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.space__section-title {
  color: #f3f4f6;
  font-size: 0.95rem;
  font-weight: 600;
}
.space__section-note {
  color: #9ca3af;
  font-size: 0.82rem;
  line-height: 1.45;
}
.space__status {
  font-size: 0.82rem;
  line-height: 1.45;
}
.space__status--error {
  color: #fca5a5;
}
.space__field-grid,
.space__git-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.space__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.space__field-label {
  color: #d1d5db;
  font-size: 0.82rem;
  font-weight: 500;
}
.space__field-input {
  width: 100%;
  border: 1px solid #333;
  border-radius: 0.9rem;
  background: #101010;
  color: #fff;
  outline: none;
  padding: 0.8rem 0.95rem;
  font-size: 0.92rem;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.space__field-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.16);
}
.space__field-input::placeholder {
  color: #6b7280;
}
.space__select {
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, #9ca3af 50%),
    linear-gradient(135deg, #9ca3af 50%, transparent 50%);
  background-position:
    calc(100% - 18px) calc(50% - 1px),
    calc(100% - 12px) calc(50% - 1px);
  background-repeat: no-repeat;
  background-size: 6px 6px;
  padding-right: 2.5rem;
}
.space__select:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
.space__git-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  justify-content: space-between;
}
.space__folder-field {
  display: flex;
  align-items: end;
  gap: 0.6rem;
}
.space__folder-field .space__field {
  flex: 1;
}
.space__folder-clear {
  margin-bottom: 0.1rem;
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

@media (max-width: 768px) {
  .space__field-grid,
  .space__git-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .space__folder-field {
    flex-direction: column;
    align-items: stretch;
  }

  .space__git-toolbar {
    align-items: stretch;
  }
}
</style>
