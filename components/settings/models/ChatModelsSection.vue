<script setup lang="ts">
import { ref } from 'vue'
import { useConfirmDialog } from '~/composables/useConfirmDialog'

defineProps<{
  models: ChatModelSettings[]
  loading: boolean
}>()

const emit = defineEmits<{
  create: [payload: UpsertChatModelRq]
  update: [id: string, payload: UpsertChatModelRq]
  remove: [id: string]
}>()

const { confirm } = useConfirmDialog()

const creating = ref(false)
const editingId = ref<string | null>(null)

const newChatModel = ref<UpsertChatModelRq>({
  provider: 'OPENAI',
  label: '',
  name: '',
  baseUrl: 'https://api.openai.com',
  apiKey: '',
  streaming: true,
  systemPrompt: 'You are helpful',
  priority: 10,
  temperature: 1,
  maxContextTokens: 128000
})

const editChatModel = ref<UpsertChatModelRq>({
  provider: 'OPENAI',
  label: '',
  name: '',
  baseUrl: '',
  apiKey: '',
  streaming: true,
  systemPrompt: '',
  priority: 10,
  temperature: 1,
  maxContextTokens: 128000
})

const chatProviderOptions: ChatModelProvider[] = ['OPENAI', 'ANTHROPIC']

function normalizeChatPayload(payload: UpsertChatModelRq): UpsertChatModelRq {
  return {
    provider: payload.provider,
    label: payload.label.trim(),
    name: payload.name.trim(),
    baseUrl: payload.baseUrl.trim(),
    apiKey: payload.apiKey.trim(),
    streaming: payload.streaming,
    systemPrompt: payload.systemPrompt.trim(),
    priority: Number(payload.priority),
    temperature: Number(payload.temperature),
    maxContextTokens: Number(payload.maxContextTokens)
  }
}

function isChatModelValid(payload: UpsertChatModelRq) {
  return Boolean(payload.label && payload.name && payload.baseUrl && payload.apiKey)
}

function resetCreateForm() {
  creating.value = false
  newChatModel.value = {
    provider: 'OPENAI',
    label: '',
    name: '',
    baseUrl: 'https://api.openai.com',
    apiKey: '',
    streaming: true,
    systemPrompt: 'You are helpful',
    priority: 10,
    temperature: 1,
    maxContextTokens: 128000
  }
}

function startEdit(model: ChatModelSettings) {
  editingId.value = model.id
  editChatModel.value = {
    provider: model.provider,
    label: model.label,
    name: model.name,
    baseUrl: model.baseUrl,
    apiKey: model.apiKey,
    streaming: model.streaming,
    systemPrompt: model.systemPrompt,
    priority: model.priority,
    temperature: model.temperature,
    maxContextTokens: model.maxContextTokens
  }
}

function cancelEdit() {
  editingId.value = null
}

function createChatModel() {
  const payload = normalizeChatPayload(newChatModel.value)
  if (!isChatModelValid(payload)) return
  emit('create', payload)
  resetCreateForm()
}

function saveChatModel(id: string) {
  const payload = normalizeChatPayload(editChatModel.value)
  if (!isChatModelValid(payload)) return
  emit('update', id, payload)
  cancelEdit()
}

async function removeChatModel(id: string) {
  const ok = await confirm('Remove model', 'This action cannot be undone. Continue?')
  if (!ok) return
  emit('remove', id)
  if (editingId.value === id) {
    cancelEdit()
  }
}
</script>

<template>
  <section class="settings__section">
    <div class="settings__section-head">
      <h2>Chat models</h2>
      <UButton color="primary" variant="solid" size="sm" @click="creating = !creating">
        <Icon name="material-symbols:add" class="mr-1" />
        {{ creating ? 'Cancel' : 'Create model' }}
      </UButton>
    </div>

    <div v-if="creating" class="settings__card">
      <h3 class="settings__card-title">New chat model</h3>
      <div class="settings__grid settings__grid--chat">
        <label class="settings__field">
          <span>Provider</span>
          <select v-model="newChatModel.provider" class="settings__input">
            <option v-for="option in chatProviderOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </label>
        <label class="settings__field">
          <span>Label</span>
          <input v-model="newChatModel.label" type="text" class="settings__input" />
        </label>
        <label class="settings__field">
          <span>Name</span>
          <input v-model="newChatModel.name" type="text" class="settings__input" />
        </label>
        <label class="settings__field">
          <span>Base URL</span>
          <input v-model="newChatModel.baseUrl" type="text" class="settings__input" />
        </label>
        <label class="settings__field">
          <span>API key</span>
          <input v-model="newChatModel.apiKey" type="password" class="settings__input" />
        </label>
        <label class="settings__field settings__field--inline">
          <input v-model="newChatModel.streaming" type="checkbox" />
          <span>Streaming</span>
        </label>
        <label class="settings__field">
          <span>Priority</span>
          <input v-model.number="newChatModel.priority" type="number" class="settings__input" />
        </label>
        <label class="settings__field">
          <span>Temperature</span>
          <input
            v-model.number="newChatModel.temperature"
            type="number"
            min="0"
            max="2"
            step="0.1"
            class="settings__input"
          />
        </label>
        <label class="settings__field">
          <span>Max context tokens</span>
          <input
            v-model.number="newChatModel.maxContextTokens"
            type="number"
            class="settings__input"
          />
        </label>
        <label class="settings__field settings__field--full">
          <span>System prompt</span>
          <textarea v-model="newChatModel.systemPrompt" rows="3" class="settings__textarea" />
        </label>
      </div>
      <div class="settings__actions">
        <UButton
          color="primary"
          variant="solid"
          size="sm"
          :loading="loading"
          @click="createChatModel"
        >
          Save
        </UButton>
        <UButton color="neutral" variant="outline" size="sm" @click="resetCreateForm"
          >Cancel</UButton
        >
      </div>
    </div>

    <div v-if="!models.length && !loading" class="settings__empty">
      No chat models configured yet.
    </div>

    <div v-for="model in models" :key="model.id" class="settings__card">
      <template v-if="editingId === model.id">
        <h3 class="settings__card-title">Edit: {{ model.label }}</h3>
        <div class="settings__grid settings__grid--chat">
          <label class="settings__field">
            <span>Provider</span>
            <select v-model="editChatModel.provider" class="settings__input">
              <option v-for="option in chatProviderOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </label>
          <label class="settings__field">
            <span>Label</span>
            <input v-model="editChatModel.label" type="text" class="settings__input" />
          </label>
          <label class="settings__field">
            <span>Name</span>
            <input v-model="editChatModel.name" type="text" class="settings__input" />
          </label>
          <label class="settings__field">
            <span>Base URL</span>
            <input v-model="editChatModel.baseUrl" type="text" class="settings__input" />
          </label>
          <label class="settings__field">
            <span>API key</span>
            <input v-model="editChatModel.apiKey" type="password" class="settings__input" />
          </label>
          <label class="settings__field settings__field--inline">
            <input v-model="editChatModel.streaming" type="checkbox" />
            <span>Streaming</span>
          </label>
          <label class="settings__field">
            <span>Priority</span>
            <input v-model.number="editChatModel.priority" type="number" class="settings__input" />
          </label>
          <label class="settings__field">
            <span>Temperature</span>
            <input
              v-model.number="editChatModel.temperature"
              type="number"
              min="0"
              max="2"
              step="0.1"
              class="settings__input"
            />
          </label>
          <label class="settings__field">
            <span>Max context tokens</span>
            <input
              v-model.number="editChatModel.maxContextTokens"
              type="number"
              class="settings__input"
            />
          </label>
          <label class="settings__field settings__field--full">
            <span>System prompt</span>
            <textarea v-model="editChatModel.systemPrompt" rows="3" class="settings__textarea" />
          </label>
        </div>
        <div class="settings__actions">
          <UButton
            color="primary"
            variant="solid"
            size="sm"
            :loading="loading"
            @click="saveChatModel(model.id)"
          >
            Save
          </UButton>
          <UButton color="neutral" variant="outline" size="sm" @click="cancelEdit">Cancel</UButton>
          <UButton
            color="error"
            variant="soft"
            size="sm"
            :loading="loading"
            @click="removeChatModel(model.id)"
          >
            Delete
          </UButton>
        </div>
      </template>

      <template v-else>
        <div class="settings__card-head">
          <div>
            <h3 class="settings__card-title">{{ model.label }}</h3>
            <p class="settings__meta">
              {{ model.provider }} - {{ model.name }} - priority {{ model.priority }}
            </p>
          </div>
          <div class="settings__actions">
            <UButton color="neutral" variant="soft" size="xs" @click="startEdit(model)"
              >Edit</UButton
            >
            <UButton
              color="error"
              variant="soft"
              size="xs"
              :loading="loading"
              @click="removeChatModel(model.id)"
            >
              Delete
            </UButton>
          </div>
        </div>
        <p class="settings__meta">Base URL: {{ model.baseUrl }}</p>
        <p class="settings__meta">System prompt: {{ model.systemPrompt || 'Not set' }}</p>
      </template>
    </div>
  </section>
</template>

<style scoped>
@import 'tailwindcss/theme';

.settings__section {
  @apply flex flex-col gap-3;
}

.settings__section-head {
  @apply flex items-center justify-between;
}

.settings__section-head h2 {
  @apply text-lg font-semibold text-white;
}

.settings__card {
  @apply rounded-lg border border-[#333] bg-[#1e1e1e] p-4;
}

.settings__card-head {
  @apply mb-2 flex items-start justify-between gap-3;
}

.settings__card-title {
  @apply text-base font-semibold text-white;
}

.settings__meta {
  @apply text-sm text-gray-400;
}

.settings__grid {
  @apply grid gap-3;
}

.settings__grid--chat {
  @apply md:grid-cols-2;
}

.settings__field {
  @apply flex flex-col gap-1;
}

.settings__field span {
  @apply text-xs text-gray-400;
}

.settings__field--inline {
  @apply flex-row items-center gap-2 pt-6;
}

.settings__field--full {
  @apply md:col-span-2;
}

.settings__input,
.settings__textarea {
  @apply w-full rounded-md border border-[#3d3d3d] bg-[#111] px-3 py-2 text-white outline-none;
}

.settings__input:focus,
.settings__textarea:focus {
  @apply border-blue-500 ring-2 ring-blue-500/30;
}

.settings__actions {
  @apply mt-3 flex flex-wrap gap-2;
}

.settings__empty {
  @apply rounded-lg border border-dashed border-[#3a3a3a] bg-[#1b1b1b] p-5 text-sm text-gray-400;
}
</style>
