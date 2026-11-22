<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfirmDialog } from '~/composables/useConfirmDialog'

const props = defineProps<{
  models: ChatModelSettings[]
  loading: boolean
}>()

const emit = defineEmits<{
  create: [payload: UpsertChatModelRq]
  update: [id: string, payload: UpsertChatModelRq]
  remove: [id: string]
}>()

const { confirm } = useConfirmDialog()

const AGENT: ChatModelProvider = 'AGENT'
const NEW = 'new'

const providers: Array<{ value: ChatModelProvider; label: string }> = [
  { value: 'OPENAI', label: 'OpenAI' },
  { value: 'ANTHROPIC', label: 'Anthropic' },
  { value: 'AGENT', label: 'Agent' }
]

const DEFAULT_URLS: Partial<Record<ChatModelProvider, string>> = {
  OPENAI: 'https://api.openai.com',
  ANTHROPIC: 'https://api.anthropic.com'
}

function blank(): UpsertChatModelRq {
  return {
    provider: 'OPENAI',
    label: '',
    name: '',
    baseUrl: DEFAULT_URLS.OPENAI!,
    apiKey: '',
    streaming: true,
    systemPrompt: '',
    priority: 10,
    temperature: 1,
    maxContextTokens: 128000,
    thinking: false,
    maxOutputTokens: 0,
    vision: false
  }
}

function fromModel(model: ChatModelSettings): UpsertChatModelRq {
  return {
    provider: model.provider,
    label: model.label,
    name: model.name,
    baseUrl: model.baseUrl,
    apiKey: model.apiKey,
    streaming: model.streaming,
    systemPrompt: model.systemPrompt ?? '',
    priority: model.priority,
    temperature: model.temperature,
    maxContextTokens: model.maxContextTokens,
    thinking: Boolean(model.thinking),
    maxOutputTokens: model.maxOutputTokens ?? 0,
    vision: Boolean(model.vision)
  }
}

const selectedId = ref<string | null>(null)
const form = ref<UpsertChatModelRq>(blank())
const original = ref('')

const selectedModel = computed(() => props.models.find((m) => m.id === selectedId.value))
const isNew = computed(() => selectedId.value === NEW)
const isAgent = computed(() => form.value.provider === AGENT)
// the Anthropic API no longer accepts sampling options, so temperature only applies to OpenAI
const supportsTemperature = computed(() => form.value.provider === 'OPENAI')
const dirty = computed(() => JSON.stringify(form.value) !== original.value)
const valid = computed(() =>
  Boolean(
    form.value.label.trim() &&
      form.value.name.trim() &&
      form.value.apiKey.trim() &&
      (isAgent.value || form.value.baseUrl.trim())
  )
)

function select(id: string | null) {
  selectedId.value = id
  const model = props.models.find((m) => m.id === id)
  form.value = model ? fromModel(model) : blank()
  original.value = JSON.stringify(form.value)
}

watch(
  () => props.models,
  (models) => {
    if (isNew.value) return
    if (!selectedId.value || !models.some((m) => m.id === selectedId.value)) {
      select(models[0]?.id ?? null)
    } else if (!dirty.value) {
      select(selectedId.value)
    }
  },
  { immediate: true, deep: true }
)

function setProvider(provider: ChatModelProvider) {
  const previous = form.value.provider
  if (previous === provider) return
  form.value.provider = provider
  if (provider === AGENT) {
    form.value.thinking = true
    form.value.vision = true
    form.value.baseUrl = ''
    if (!form.value.name) form.value.name = 'opus'
  } else if (!form.value.baseUrl || form.value.baseUrl === DEFAULT_URLS[previous]) {
    form.value.baseUrl = DEFAULT_URLS[provider] ?? ''
  }
}

function startCreate() {
  select(null)
  selectedId.value = NEW
  original.value = JSON.stringify(form.value)
}

function normalized(): UpsertChatModelRq {
  const f = form.value
  return {
    provider: f.provider,
    label: f.label.trim(),
    name: f.name.trim(),
    baseUrl: isAgent.value ? '' : f.baseUrl.trim(),
    apiKey: f.apiKey.trim(),
    streaming: isAgent.value ? true : f.streaming,
    systemPrompt: f.systemPrompt.trim(),
    priority: Number(f.priority),
    temperature: Number(f.temperature),
    maxContextTokens: Number(f.maxContextTokens),
    thinking: f.thinking,
    maxOutputTokens: Math.max(0, Math.floor(Number(f.maxOutputTokens) || 0)),
    vision: f.vision
  }
}

function save() {
  if (!valid.value) return
  const payload = normalized()
  if (isNew.value) {
    emit('create', payload)
    selectedId.value = null
  } else if (selectedId.value) {
    emit('update', selectedId.value, payload)
  }
  original.value = JSON.stringify(form.value)
}

function revert() {
  if (isNew.value) select(props.models[0]?.id ?? null)
  else select(selectedId.value)
}

async function remove() {
  const model = selectedModel.value
  if (!model) return
  const ok = await confirm(`Delete “${model.label}”?`, 'This cannot be undone.')
  if (!ok) return
  emit('remove', model.id)
  selectedId.value = null
}

function providerLabel(provider: ChatModelProvider) {
  return providers.find((p) => p.value === provider)?.label ?? provider
}

function initials(model: ChatModelSettings) {
  if (model.provider === AGENT) return 'AG'
  return model.provider === 'ANTHROPIC' ? 'A' : 'O'
}
</script>

<template>
  <div class="models">
    <section class="models__list" aria-label="Chat models">
      <div class="models__list-head">
        <h2 class="ui-section-label">Chat models</h2>
        <button type="button" class="ui-btn ui-btn--tinted ui-btn--sm" @click="startCreate">
          <Icon name="lucide:plus" />
          Add model
        </button>
      </div>

      <div v-if="models.length || isNew" class="ui-group">
        <button
          v-if="isNew"
          type="button"
          class="ui-group-row models__row models__row--active"
          aria-current="true"
        >
          <span class="models__badge models__badge--new"><Icon name="lucide:plus" /></span>
          <span class="models__row-text">
            <span class="models__row-title">{{ form.label || 'New model' }}</span>
            <span class="models__row-meta">Not saved yet</span>
          </span>
        </button>
        <button
          v-for="model in models"
          :key="model.id"
          type="button"
          class="ui-group-row models__row"
          :class="{ 'models__row--active': model.id === selectedId }"
          :aria-current="model.id === selectedId"
          @click="select(model.id)"
        >
          <span class="models__badge" :class="{ 'models__badge--agent': model.provider === AGENT }">
            {{ initials(model) }}
          </span>
          <span class="models__row-text">
            <span class="models__row-title">{{ model.label }}</span>
            <span class="models__row-meta">
              {{ providerLabel(model.provider) }} · {{ model.name }}
            </span>
          </span>
          <Icon name="lucide:chevron-right" class="models__chevron" />
        </button>
      </div>
      <div v-else-if="!loading" class="ui-empty">
        <Icon name="lucide:sparkles" class="ui-empty__icon" />
        <p class="ui-empty__title">No chat models yet</p>
        <p class="text-sm">Add an OpenAI, Anthropic or agent model to start chatting.</p>
      </div>
      <p class="ui-hint">
        Lower priority comes first; the first model is the default for new chats.
      </p>
    </section>

    <section v-if="selectedId" class="models__editor" aria-label="Edit model">
      <div class="models__editor-head">
        <span class="models__editor-icon">
          <Icon :name="isAgent ? 'lucide:terminal' : 'lucide:sparkles'" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="models__editor-title">
            {{ form.label || (isNew ? 'New model' : 'Untitled') }}
          </div>
          <div class="ui-subtitle">
            {{ isAgent ? 'Runs in the sandboxed agent runner' : 'Direct API model' }}
          </div>
        </div>
      </div>

      <div class="models__block">
        <div class="ui-section-label">Provider</div>
        <div class="ui-segmented models__providers" role="radiogroup" aria-label="Provider">
          <button
            v-for="p in providers"
            :key="p.value"
            type="button"
            role="radio"
            class="ui-segmented__item"
            :aria-checked="form.provider === p.value"
            @click="setProvider(p.value)"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <div class="models__block">
        <div class="ui-section-label">Model</div>
        <div class="ui-group">
          <label class="ui-group-row">
            <span class="ui-group-row__label">Label</span>
            <input
              v-model="form.label"
              type="text"
              class="ui-group-row__control"
              placeholder="Shown in the model picker"
            />
          </label>
          <label class="ui-group-row">
            <span class="ui-group-row__label">Model</span>
            <input
              v-model="form.name"
              type="text"
              class="ui-group-row__control ui-mono text-[13px]"
              :placeholder="isAgent ? 'opus, sonnet, haiku or a full id' : 'e.g. gpt-5.4'"
            />
          </label>
          <label v-if="!isAgent" class="ui-group-row">
            <span class="ui-group-row__label">Base URL</span>
            <input
              v-model="form.baseUrl"
              type="url"
              class="ui-group-row__control ui-mono text-[13px]"
              placeholder="https://"
            />
          </label>
          <label class="ui-group-row">
            <span class="ui-group-row__label">{{ isAgent ? 'OAuth token' : 'API key' }}</span>
            <input
              v-model="form.apiKey"
              type="password"
              class="ui-group-row__control"
              autocomplete="off"
              :placeholder="isAgent ? 'OAuth token or API key' : 'sk-…'"
            />
          </label>
        </div>
        <p v-if="isAgent" class="ui-hint">
          The token is passed to the agent runner with every request and never stored there. See the
          runner README for how to get one.
        </p>
      </div>

      <div class="models__block">
        <div class="ui-section-label">Behaviour</div>
        <div class="ui-group">
          <label class="ui-group-row">
            <span class="flex-1">Priority</span>
            <input
              v-model.number="form.priority"
              type="number"
              class="ui-group-row__control models__num"
            />
          </label>
          <div v-if="!isAgent" class="ui-group-row">
            <span class="flex-1">Streaming</span>
            <button
              type="button"
              role="switch"
              class="ui-switch"
              aria-label="Streaming"
              :aria-checked="form.streaming"
              @click="form.streaming = !form.streaming"
            ></button>
          </div>
          <label v-if="supportsTemperature" class="ui-group-row">
            <span class="flex-1">Temperature</span>
            <input
              v-model.number="form.temperature"
              type="number"
              min="0"
              max="2"
              step="0.1"
              class="ui-group-row__control models__num"
            />
          </label>
          <div class="ui-group-row">
            <span class="flex-1">Thinking</span>
            <button
              type="button"
              role="switch"
              class="ui-switch"
              aria-label="Thinking"
              :aria-checked="form.thinking"
              @click="form.thinking = !form.thinking"
            ></button>
          </div>
          <div class="ui-group-row">
            <span class="flex-1">Images</span>
            <button
              type="button"
              role="switch"
              class="ui-switch"
              aria-label="Images"
              :aria-checked="form.vision"
              @click="form.vision = !form.vision"
            ></button>
          </div>
          <label class="ui-group-row">
            <span class="flex-1">Max context tokens</span>
            <input
              v-model.number="form.maxContextTokens"
              type="number"
              min="1000"
              class="ui-group-row__control models__num models__num--wide"
            />
          </label>
          <label v-if="!isAgent" class="ui-group-row">
            <span class="flex-1">Max output tokens</span>
            <input
              v-model.number="form.maxOutputTokens"
              type="number"
              min="0"
              placeholder="0"
              class="ui-group-row__control models__num models__num--wide"
            />
          </label>
        </div>
        <p class="ui-hint">
          Thinking adds an effort picker (Off, Low, Medium, High) to the chat and shows the model's
          reasoning. Turn it on only for reasoning models: Anthropic, OpenAI o-series / GPT-5,
          DeepSeek Reasoner and similar.
        </p>
        <p class="ui-hint">
          Images lets the chat attach screenshots (paste, drop or the paperclip); turn it on only
          for models with image input.
        </p>
        <p class="ui-hint">
          Max context tokens is the model's real window: older messages are left out so a request
          always fits it. Max output tokens is the answer limit (reasoning included); 0 uses the
          provider default. Raise it if long answers get cut off.
        </p>
      </div>

      <div class="models__block">
        <label for="model-prompt" class="ui-section-label">
          {{ isAgent ? 'Extra instructions' : 'System prompt' }}
        </label>
        <textarea
          id="model-prompt"
          v-model="form.systemPrompt"
          rows="4"
          class="ui-input"
          :placeholder="isAgent ? 'Appended to the agent system prompt (optional)' : 'Optional'"
        />
      </div>

      <div class="models__actions">
        <button
          type="button"
          class="ui-btn ui-btn--primary ui-btn--lg"
          :disabled="!valid || (!dirty && !isNew) || loading"
          @click="save"
        >
          {{ isNew ? 'Add model' : 'Save changes' }}
        </button>
        <button
          type="button"
          class="ui-btn ui-btn--secondary ui-btn--lg"
          :disabled="!dirty && !isNew"
          @click="revert"
        >
          Cancel
        </button>
        <div class="flex-1"></div>
        <button
          v-if="!isNew"
          type="button"
          class="ui-btn ui-btn--danger ui-btn--lg"
          :disabled="loading"
          @click="remove"
        >
          Delete model
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.models {
  @apply flex flex-wrap items-start gap-6;
}

.models__list {
  @apply flex min-w-0 flex-[1_1_320px] flex-col gap-2;
}

.models__list-head {
  @apply flex items-center justify-between;
}

.models__row {
  @apply min-h-[60px] gap-3 px-3.5;
}

.models__row--active,
.models__row--active:hover {
  background: rgba(10, 132, 255, 0.14) !important;
}

.models__badge {
  @apply flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-[13px] font-semibold;
  background: var(--c-surface-3);
  color: var(--c-text);
}

.models__badge--agent {
  background: var(--c-accent-soft);
  color: var(--c-accent-hover);
}

.models__badge--new {
  background: var(--c-accent-fill);
  color: #fff;
}

.models__row-text {
  @apply flex min-w-0 flex-1 flex-col;
}

.models__row-title {
  @apply truncate text-sm font-medium;
  color: var(--c-text);
}

.models__row-meta {
  @apply truncate text-xs;
  color: var(--c-text-4);
}

.models__chevron {
  @apply flex-none text-sm;
  color: #636366;
}

.models__editor {
  @apply flex min-w-0 flex-[999_1_480px] flex-col gap-5;
}

.models__editor-head {
  @apply flex items-center gap-3;
}

.models__editor-icon {
  @apply flex h-11 w-11 flex-none items-center justify-center rounded-[12px] text-xl;
  background: var(--c-surface-2);
  border: 1px solid var(--c-sep-strong);
  color: var(--c-accent);
}

.models__editor-title {
  @apply truncate text-xl font-semibold tracking-[-0.01em];
  color: var(--c-text);
}

.models__block {
  @apply flex flex-col gap-2;
}

.models__providers {
  @apply grid w-full grid-cols-3;
}

.models__providers .ui-segmented__item {
  @apply h-[34px];
}

.models__num {
  @apply w-24 flex-none;
}

.models__num--wide {
  @apply w-32;
}

.models__code {
  @apply rounded-[5px] px-1.5 py-px;
  font-family: var(--font-mono);
  background: var(--c-surface-2);
  color: var(--c-text-2);
}

.models__actions {
  @apply flex flex-wrap items-center gap-2.5 pt-1;
}
</style>
