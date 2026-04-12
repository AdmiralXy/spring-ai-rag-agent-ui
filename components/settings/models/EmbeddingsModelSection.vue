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

function save() {
  const payload: EmbeddingsModelSettings = {
    provider: 'OPENAI',
    baseUrl: form.value.baseUrl.trim(),
    apiKey: form.value.apiKey.trim(),
    name: form.value.name.trim(),
    dimensions: Number(form.value.dimensions),
    maxDocumentTokens: Number(form.value.maxDocumentTokens)
  }

  if (!payload.baseUrl || !payload.apiKey || !payload.name) return
  emit('save', payload)
}
</script>

<template>
  <section class="settings__section">
    <div class="settings__section-head">
      <h2>Embeddings model</h2>
      <UButton
        color="primary"
        variant="solid"
        size="sm"
        :disabled="!dirty"
        :loading="loading"
        @click="save"
      >
        Save
      </UButton>
    </div>

    <div class="settings__card">
      <div class="settings__grid settings__grid--singleton">
        <label class="settings__field">
          <span>Provider</span>
          <input value="OPENAI" type="text" class="settings__input" disabled />
        </label>
        <label class="settings__field">
          <span>Name</span>
          <input v-model="form.name" type="text" class="settings__input" />
        </label>
        <label class="settings__field">
          <span>Base URL</span>
          <input v-model="form.baseUrl" type="text" class="settings__input" />
        </label>
        <label class="settings__field">
          <span>API key</span>
          <input v-model="form.apiKey" type="password" class="settings__input" />
        </label>
        <label class="settings__field">
          <span>Dimensions</span>
          <input v-model.number="form.dimensions" type="number" class="settings__input" />
        </label>
        <label class="settings__field">
          <span>Max document tokens</span>
          <input v-model.number="form.maxDocumentTokens" type="number" class="settings__input" />
        </label>
      </div>
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

.settings__grid {
  @apply grid gap-3 md:grid-cols-2;
}

.settings__field {
  @apply flex flex-col gap-1;
}

.settings__field span {
  @apply text-xs text-gray-400;
}

.settings__input {
  @apply w-full rounded-md border border-[#3d3d3d] bg-[#111] px-3 py-2 text-white outline-none;
}

.settings__input:focus {
  @apply border-blue-500 ring-2 ring-blue-500/30;
}

.settings__input:disabled {
  @apply opacity-70;
}
</style>
