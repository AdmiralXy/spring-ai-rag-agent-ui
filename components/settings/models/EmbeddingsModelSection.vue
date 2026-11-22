<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  model: EmbeddingsModelSettings
  loading: boolean
}>()

const emit = defineEmits<{
  save: [payload: EmbeddingsModelSettings]
}>()

const form = ref<EmbeddingsModelSettings>({ ...props.model })

watch(
  () => props.model,
  (value) => {
    form.value = { ...value }
  },
  { deep: true, immediate: true }
)

const dirty = computed(() => JSON.stringify(form.value) !== JSON.stringify(props.model))
const valid = computed(() =>
  Boolean(form.value.baseUrl?.trim() && form.value.apiKey?.trim() && form.value.name?.trim())
)

function save() {
  if (!valid.value) return
  emit('save', {
    provider: 'OPENAI',
    baseUrl: form.value.baseUrl.trim(),
    apiKey: form.value.apiKey.trim(),
    name: form.value.name.trim(),
    dimensions: Number(form.value.dimensions),
    maxDocumentTokens: Number(form.value.maxDocumentTokens)
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
        Dimensions must match the vector column; changing the model requires re-indexing spaces.
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
</style>
