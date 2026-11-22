<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  step: ChatMessagePart
  /** The run is still going (a step without output is in progress) */
  live?: boolean
}>()

const open = ref(false)

const TOOLS: Record<string, { icon: string; label: string; inputCaption?: string }> = {
  Bash: { icon: 'lucide:terminal', label: 'Run', inputCaption: 'Command' },
  Write: { icon: 'lucide:file-plus', label: 'Create', inputCaption: 'Content' },
  Edit: { icon: 'lucide:file-pen-line', label: 'Edit', inputCaption: 'Change' },
  MultiEdit: { icon: 'lucide:file-pen-line', label: 'Edit', inputCaption: 'Changes' },
  NotebookEdit: { icon: 'lucide:notebook-pen', label: 'Edit notebook' },
  Read: { icon: 'lucide:file-text', label: 'Read' },
  Glob: { icon: 'lucide:folder-search', label: 'Find files' },
  Grep: { icon: 'lucide:search', label: 'Search' },
  WebSearch: { icon: 'lucide:globe', label: 'Web search', inputCaption: 'Query' },
  WebFetch: { icon: 'lucide:link', label: 'Open page' },
  Task: { icon: 'lucide:git-fork', label: 'Sub-agent', inputCaption: 'Task' },
  Agent: { icon: 'lucide:git-fork', label: 'Sub-agent', inputCaption: 'Task' },
  TodoWrite: { icon: 'lucide:list-checks', label: 'Plan', inputCaption: 'Plan' }
}

const meta = computed(
  () => TOOLS[props.step.name ?? ''] ?? { icon: 'lucide:wrench', label: props.step.name ?? 'Tool' }
)
const running = computed(() => props.live && props.step.output === undefined)
const failed = computed(() => Boolean(props.step.isError))
const hasDetails = computed(() => Boolean(props.step.input || props.step.output))
</script>

<template>
  <div class="step" :class="{ 'step--nested': step.parentId, 'step--open': open }">
    <button
      type="button"
      class="step__head"
      :disabled="!hasDetails"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span
        class="step__icon"
        :class="{ 'step__icon--live': running, 'step__icon--error': failed }"
      >
        <Icon :name="meta.icon" />
      </span>
      <span class="step__label">{{ meta.label }}</span>
      <span class="step__title">{{ step.title }}</span>
      <Icon
        v-if="running"
        name="lucide:loader-circle"
        class="step__state step__state--live animate-spin"
        aria-label="Running"
      />
      <Icon
        v-else-if="failed"
        name="lucide:circle-alert"
        class="step__state step__state--error"
        aria-label="Failed"
      />
      <Icon
        v-else-if="step.output !== undefined"
        name="lucide:check"
        class="step__state step__state--ok"
        aria-label="Done"
      />
      <Icon v-if="hasDetails" name="lucide:chevron-down" class="step__chevron" />
    </button>

    <div v-if="open" class="step__body">
      <template v-if="step.input">
        <div class="step__caption">{{ meta.inputCaption ?? 'Input' }}</div>
        <pre class="step__pre">{{ step.input }}</pre>
      </template>
      <template v-if="step.output">
        <div class="step__caption">{{ failed ? 'Error' : 'Output' }}</div>
        <pre class="step__pre" :class="{ 'step__pre--error': failed }">{{ step.output }}</pre>
      </template>
    </div>
  </div>
</template>

<style scoped>
@import 'tailwindcss/theme';

.step + .step {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.step__head {
  @apply flex min-h-11 w-full min-w-0 items-center gap-2.5 border-0 bg-transparent px-3.5 text-left;
}

.step--nested .step__head {
  @apply pl-9;
}

.step__head:not(:disabled) {
  @apply cursor-pointer;
}

.step__head:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.03);
}

.step__icon {
  @apply flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] text-[13px];
  background: var(--c-surface-2);
  color: var(--c-text-3);
}

.step__icon--live {
  background: var(--c-accent-soft);
  color: var(--c-accent-hover);
}

.step__icon--error {
  background: var(--c-danger-soft);
  color: var(--c-danger);
}

.step__label {
  @apply flex-none text-[13px] font-medium;
  color: var(--c-text);
}

.step__title {
  @apply min-w-0 flex-1 truncate text-xs;
  font-family: var(--font-mono);
  color: var(--c-text-3);
}

.step__state {
  @apply flex-none text-[15px];
}

.step__state--ok {
  color: var(--c-success);
}

.step__state--live {
  color: var(--c-accent);
}

.step__state--error {
  color: var(--c-danger);
}

.step__chevron {
  @apply flex-none text-sm transition-transform;
  color: var(--c-text-4);
}

.step--open .step__chevron {
  transform: rotate(180deg);
}

.step__body {
  @apply flex flex-col gap-1.5 pr-3.5 pb-3.5 pl-[50px];
}

.step--nested .step__body {
  @apply pl-[72px];
}

.step__caption {
  @apply mt-1 text-[11px] font-semibold tracking-[0.04em] uppercase;
  color: var(--c-text-4);
}

.step__pre {
  @apply m-0 max-h-72 overflow-auto px-3 py-2.5 text-xs leading-relaxed break-words whitespace-pre-wrap;
  border-radius: var(--r-md);
  background: var(--c-bg);
  border: 1px solid var(--c-sep);
  font-family: var(--font-mono);
  color: var(--c-text-2);
}

.step__pre--error {
  color: #ffb4ae;
}
</style>
