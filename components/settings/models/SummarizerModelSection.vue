<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  model: SummarizerModelSettings
  loading: boolean
}>()

const emit = defineEmits<{
  save: [payload: SummarizerModelSettings]
}>()

const form = ref<SummarizerModelSettings>({ ...props.model })
const providerOptions: ChatModelProvider[] = ['OPENAI', 'ANTHROPIC']

watch(
  () => props.model,
  (value) => {
    form.value = { ...value }
  },
  { deep: true, immediate: true }
)

const dirty = computed(() => JSON.stringify(form.value) !== JSON.stringify(props.model))

function save() {
  const payload: SummarizerModelSettings = {
    provider: form.value.provider,
    name: form.value.name.trim(),
    baseUrl: form.value.baseUrl.trim(),
    apiKey: form.value.apiKey.trim(),
    systemPrompt: form.value.systemPrompt.trim()
  }

  if (!payload.name || !payload.baseUrl || !payload.apiKey) return
  emit('save', payload)
}
</script>

<template>
  <section class="settings__section">
    <div class="settings__section-head">
      <h2>Summarizer model</h2>
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
          <select v-model="form.provider" class="settings__input">
            <option v-for="option in providerOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
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
        <label class="settings__field settings__field--full">
          <span>System prompt</span>
          <textarea v-model="form.systemPrompt" rows="4" class="settings__textarea" />
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
</style>
