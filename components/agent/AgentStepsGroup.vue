<script setup lang="ts">
import { computed, ref } from 'vue'
import AgentToolStep from '~/components/agent/AgentToolStep.vue'

const COLLAPSE_AFTER = 6

const props = defineProps<{
  steps: ChatMessagePart[]
  live?: boolean
}>()

const expanded = ref(false)

const running = computed(() => props.live && props.steps.some((s) => s.output === undefined))
const failedCount = computed(() => props.steps.filter((s) => s.isError).length)
const hiddenCount = computed(() =>
  !expanded.value && props.steps.length > COLLAPSE_AFTER
    ? props.steps.length - COLLAPSE_AFTER + 1
    : 0
)
// keep the latest steps visible while collapsed
const visible = computed(() =>
  hiddenCount.value ? props.steps.slice(props.steps.length - (COLLAPSE_AFTER - 1)) : props.steps
)
</script>

<template>
  <section class="steps" aria-label="Agent steps">
    <div class="steps__head">
      <Icon
        v-if="running"
        name="lucide:loader-circle"
        class="steps__head-icon steps__head-icon--live animate-spin"
      />
      <Icon
        v-else-if="failedCount"
        name="lucide:circle-alert"
        class="steps__head-icon steps__head-icon--warn"
      />
      <Icon v-else name="lucide:check" class="steps__head-icon steps__head-icon--ok" />
      <span class="steps__count"
        >{{ steps.length }} {{ steps.length === 1 ? 'step' : 'steps' }}</span
      >
      <span v-if="failedCount" class="steps__meta">· {{ failedCount }} failed</span>
      <span v-if="running" class="steps__meta">· working</span>
    </div>

    <button v-if="hiddenCount" type="button" class="steps__more" @click="expanded = true">
      <Icon name="lucide:chevrons-up-down" />
      Show {{ hiddenCount }} earlier steps
    </button>

    <AgentToolStep v-for="step in visible" :key="step.toolId" :step="step" :live="live" />
  </section>
</template>

<style scoped>
@import 'tailwindcss/theme';

.steps {
  @apply overflow-hidden;
  border-radius: var(--r-lg);
  background: var(--c-surface);
  border: 1px solid var(--c-sep);
}

.steps__head {
  @apply flex h-9 items-center gap-2 px-3.5 text-xs;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: var(--c-text-3);
}

.steps__head-icon {
  @apply text-sm;
}

.steps__head-icon--ok {
  color: var(--c-success);
}

.steps__head-icon--live {
  color: var(--c-accent);
}

.steps__head-icon--warn {
  color: var(--c-warning);
}

.steps__count {
  @apply font-medium;
  color: var(--c-text-2);
}

.steps__more {
  @apply flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 border-0 bg-transparent text-xs;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: var(--c-accent);
}

.steps__more:hover {
  background: rgba(255, 255, 255, 0.03);
}
</style>
