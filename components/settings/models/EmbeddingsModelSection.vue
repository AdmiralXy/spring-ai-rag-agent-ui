<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfirmDialog } from '~/composables/useConfirmDialog'

const props = defineProps<{
  model: EmbeddingsModelSettings
  loading: boolean
}>()

const emit = defineEmits<{
  save: [payload: EmbeddingsModelSettings]
}>()

const { confirm } = useConfirmDialog()
const form = ref<EmbeddingsModelSettings>({ ...props.model })

watch(
  () => props.model,
  (value) => {
    form.value = { ...value }
  },
  { deep: true, immediate: true }
)

function editable(model: EmbeddingsModelSettings) {
  return {
    baseUrl: model.baseUrl ?? '',
    apiKey: model.apiKey ?? '',
    name: model.name ?? '',
    dimensions: Number(model.dimensions),
    maxDocumentTokens: Number(model.maxDocumentTokens)
  }
}

const dirty = computed(
  () => JSON.stringify(editable(form.value)) !== JSON.stringify(editable(props.model))
)
const valid = computed(() =>
  Boolean(
    form.value.baseUrl?.trim() &&
      form.value.apiKey?.trim() &&
      form.value.name?.trim() &&
      Number(form.value.dimensions) >= 1 &&
      Number(form.value.dimensions) <= 16000 &&
      Number(form.value.maxDocumentTokens) >= 16
  )
)
const indexedChunks = computed(() => props.model.indexedChunks ?? 0)
/** Vectors of another model, URL or size cannot be compared with the stored ones */
const vectorsChange = computed(
  () =>
    form.value.name.trim() !== (props.model.name ?? '').trim() ||
    form.value.baseUrl.trim() !== (props.model.baseUrl ?? '').trim() ||
    Number(form.value.dimensions) !== Number(props.model.dimensions)
)
const willReset = computed(() => vectorsChange.value && indexedChunks.value > 0)

async function save() {
  if (!valid.value) return
  if (willReset.value) {
    const ok = await confirm(
      'Change the embedding model?',
      `Your spaces hold ${indexedChunks.value} chunks indexed with the current model. They cannot be searched with another model, URL or dimension, so they will be deleted. The spaces stay, add their content again afterwards.`
    )
    if (!ok) return
  }
  emit('save', {
    provider: 'OPENAI',
    baseUrl: form.value.baseUrl.trim(),
    apiKey: form.value.apiKey.trim(),
    name: form.value.name.trim(),
    dimensions: Number(form.value.dimensions),
    maxDocumentTokens: Number(form.value.maxDocumentTokens),
    resetDocuments: willReset.value
  })
}
</script>

<template>
  <section class="section" aria-label="Embeddings model">
    <div class="section__block">
      <div class="ui-section-label">Model</div>
      <div class="ui-group">
        <div class="ui-group-row">
          <span class="ui-group-row__label">Provider</span>
          <span class="ui-group-row__control">OpenAI-compatible</span>
        </div>
        <label class="ui-group-row">
          <span class="ui-group-row__label">Model</span>
          <input
            v-model="form.name"
            type="text"
            class="ui-group-row__control ui-mono text-[13px]"
            placeholder="text-embedding-3-small"
          />
        </label>
        <label class="ui-group-row">
          <span class="ui-group-row__label">Base URL</span>
          <input
            v-model="form.baseUrl"
            type="url"
            class="ui-group-row__control ui-mono text-[13px]"
            placeholder="https://"
          />
        </label>
        <label class="ui-group-row">
          <span class="ui-group-row__label">API key</span>
          <input
            v-model="form.apiKey"
            type="password"
            autocomplete="off"
            class="ui-group-row__control"
          />
        </label>
      </div>
    </div>

    <div class="section__block">
      <div class="ui-section-label">Vectors</div>
      <div class="ui-group">
        <label class="ui-group-row">
          <span class="flex-1">Dimensions</span>
          <input
            v-model.number="form.dimensions"
            type="number"
            class="ui-group-row__control section__num"
          />
        </label>
        <label class="ui-group-row">
          <span class="flex-1">Max document tokens</span>
          <input
            v-model.number="form.maxDocumentTokens"
            type="number"
            class="ui-group-row__control section__num"
          />
        </label>
      </div>
      <p class="ui-hint">
        Dimensions must match what the model returns (1–16000). Max document tokens only affects
        content added later.
      </p>
      <p v-if="willReset" class="section__warning" role="status">
        <Icon name="lucide:triangle-alert" class="flex-none" />
        <span>
          Saving deletes the {{ indexedChunks }} chunks indexed in your spaces with the current
          model.
        </span>
      </p>
      <p v-else-if="indexedChunks" class="ui-hint">
        {{ indexedChunks }} chunks are indexed with this model. The API key can change freely;
        another model, URL or dimension requires indexing the spaces again.
      </p>
    </div>

    <div class="section__actions">
      <button
        type="button"
        class="ui-btn ui-btn--primary ui-btn--lg"
        :disabled="!dirty || !valid || loading"
        @click="save"
      >
        Save changes
      </button>
      <button
        type="button"
        class="ui-btn ui-btn--secondary ui-btn--lg"
        :disabled="!dirty"
        @click="form = { ...props.model }"
      >
        Cancel
      </button>
    </div>
  </section>
</template>

<style scoped>
@import 'tailwindcss/theme';

.section {
  @apply flex max-w-[640px] flex-col gap-5;
}

.section__block {
  @apply flex flex-col gap-2;
}

.section__num {
  @apply w-28 flex-none;
}

.section__actions {
  @apply flex flex-wrap gap-2.5;
}

.section__warning {
  @apply m-0 flex items-start gap-2 rounded-[10px] px-3 py-2.5 text-[13px] leading-snug;
  background: rgba(255, 214, 10, 0.1);
  color: var(--c-warning);
}

.section__warning :deep(svg) {
  @apply mt-0.5;
}
</style>
