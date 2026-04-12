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
  return `${mm}.${dd}.${yyyy}`
})
</script>

<template>
  <UModal
    v-model:open="openModel"
    title="Build information"
    description="Link to repository and current build metadata"
    :ui="{
      overlay: 'bg-black/60 backdrop-blur-[1px]',
      content: 'max-w-sm bg-[#171717] border border-[#2f2f2f] !divide-none !ring-0 shadow-xl',
      header: 'm-0 min-h-0 border-0 p-0',
      title: 'sr-only',
      description: 'sr-only',
      body: 'pt-0'
    }"
  >
    <template #body>
      <div class="build-info-modal">
        <a
          :href="repositoryUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="build-info-modal__link"
        >
          <Icon name="mdi:github" />
          <span>GitHub repository</span>
        </a>
        <p class="build-info-modal__row">Build: #{{ buildNumber }} {{ buildDate }}</p>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
@import 'tailwindcss/theme';

.build-info-modal {
  @apply flex flex-col gap-2;
}

.build-info-modal__link {
  @apply inline-flex items-center gap-2 text-sm text-blue-300 transition-colors duration-200;
}

.build-info-modal__link:hover {
  @apply text-blue-200;
}

.build-info-modal__row {
  @apply text-sm text-gray-300;
}
</style>
