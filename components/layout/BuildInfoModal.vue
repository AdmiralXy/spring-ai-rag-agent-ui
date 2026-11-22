<script setup lang="ts">
const openModel = defineModel<boolean>('open', { required: true })

const config = useRuntimeConfig()

const repositoryUrl = computed<string>(() =>
  String(config.public.repositoryUrl || 'https://github.com/AdmiralXy/spring-ai-rag-agent')
)
const buildNumber = computed(() => String(config.public.buildNumber || 'local'))
const buildDate = computed(() => {
  const raw = String(config.public.buildDate || '').trim()
  if (!raw) {
    return 'n/a'
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(raw)) {
    return raw
  }

  const normalized = raw.replace(/\//g, '-')
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return raw
  }

  const [, yyyy, mm, dd] = match
  return `${dd}.${mm}.${yyyy}`
})
</script>

<template>
  <UModal
    v-model:open="openModel"
    title="About"
    description="Repository and build information"
    :ui="{ content: 'max-w-sm' }"
  >
    <template #body>
      <div class="ui-group">
        <a
          :href="repositoryUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="ui-group-row build-info__link"
        >
          <Icon name="simple-icons:github" class="build-info__icon" />
          <span class="flex-1">GitHub repository</span>
          <Icon name="lucide:arrow-up-right" class="build-info__chevron" />
        </a>
        <div class="ui-group-row">
          <span class="flex-1">Build</span>
          <span class="build-info__value">#{{ buildNumber }}</span>
        </div>
        <div class="ui-group-row">
          <span class="flex-1">Date</span>
          <span class="build-info__value">{{ buildDate }}</span>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
@import 'tailwindcss/theme';

.build-info__link {
  @apply text-sm;
}

.build-info__icon {
  @apply text-base;
  color: var(--c-text-2);
}

.build-info__chevron {
  color: var(--c-text-4);
}

.build-info__value {
  @apply text-sm;
  color: var(--c-text-3);
}
</style>
