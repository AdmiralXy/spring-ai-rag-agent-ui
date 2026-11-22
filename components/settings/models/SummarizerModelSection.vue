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
const providers: Array<{ value: ChatModelProvider; label: string }> = [
  { value: 'OPENAI', label: 'OpenAI' },
  { value: 'ANTHROPIC', label: 'Anthropic' }
]

watch(
  () => props.model,
  (value) => {
    form.value = { ...value }
  },
  { deep: true, immediate: true }
)

const dirty = computed(() => JSON.stringify(form.value) !== JSON.stringify(props.model))
const valid = computed(() =>
  Boolean(form.value.name?.trim() && form.value.baseUrl?.trim() && form.value.apiKey?.trim())
)

function save() {
  if (!valid.value) return
  emit('save', {
    provider: form.value.provider,
    name: form.value.name.trim(),
    baseUrl: form.value.baseUrl.trim(),
    apiKey: form.value.apiKey.trim(),
    systemPrompt: (form.value.systemPrompt ?? '').trim()
  })
}
</script>

<template>
  <section class="section" aria-label="Summarizer model">
    <p class="ui-hint">Names new chats from their first message. Use a small, fast model.</p>

    <div class="section__block">
      <div class="ui-section-label">Provider</div>
      <div class="ui-segmented section__providers" role="radiogroup" aria-label="Provider">
        <button
          v-for="p in providers"
          :key="p.value"
          type="button"
          role="radio"
          class="ui-segmented__item"
          :aria-checked="form.provider === p.value"
          @click="form.provider = p.value"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <div class="section__block">
      <div class="ui-section-label">Model</div>
      <div class="ui-group">
        <label class="ui-group-row">
          <span class="ui-group-row__label">Model</span>
          <input
            v-model="form.name"
            type="text"
            class="ui-group-row__control ui-mono text-[13px]"
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
      <label for="summarizer-prompt" class="ui-section-label">Prompt</label>
      <textarea
        id="summarizer-prompt"
        v-model="form.systemPrompt"
        rows="4"
        class="ui-input"
        placeholder="Use %s where the first message should go"
      />
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

.section__providers {
  @apply grid w-full grid-cols-2;
}

.section__providers .ui-segmented__item {
  @apply h-[34px];
}

.section__actions {
  @apply flex flex-wrap gap-2.5;
}
</style>
