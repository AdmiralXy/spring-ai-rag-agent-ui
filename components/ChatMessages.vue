<script setup lang="ts">
import { computed, ref } from 'vue'
import MessageMarkdown from '~/components/MessageMarkdown.vue'
import AgentStepsGroup from '~/components/agent/AgentStepsGroup.vue'
import { attachmentUrl } from '~/utils/images'

const USER_COLLAPSE_CHARS = 900

const props = defineProps<{
  role: 'USER' | 'ASSISTANT' | string
  content: string
  parts?: ChatMessagePart[]
  pending?: boolean
  status?: string
  stats?: AgentRunStats
  /** Known for live answers; history answers are detected from agent-only data */
  agent?: boolean
  attachments?: ChatAttachment[]
  /** Deleting is possible (no answer is streaming) */
  deletable?: boolean
  /** The latest message of the chat: a cut-off answer offers to continue */
  last?: boolean
}>()

const emit = defineEmits<{ delete: []; continue: [] }>()

type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'thinking'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'notice'; text: string }
  | { kind: 'tools'; steps: ChatMessagePart[] }

const isUser = computed(() => props.role === 'USER')
const isAgent = computed(
  () =>
    props.agent ??
    (Boolean(props.stats) ||
      Boolean(props.parts?.some((p) => p.type === 'tool' || p.type === 'thinking')))
)
const hasParts = computed(() => Boolean(props.parts))
const userExpanded = ref(false)
const openThinking = ref<number[]>([])
// reasoning the user collapsed while it was still streaming
const closedThinking = ref<number[]>([])
const copied = ref(false)

const userCollapsible = computed(() => isUser.value && props.content.length > USER_COLLAPSE_CHARS)
const userText = computed(() =>
  userCollapsible.value && !userExpanded.value
    ? `${props.content.slice(0, USER_COLLAPSE_CHARS).trimEnd()}…`
    : props.content
)

const segments = computed<Segment[]>(() => {
  if (!props.parts) return [{ kind: 'text', text: props.content }]
  const out: Segment[] = []
  for (const part of props.parts) {
    if (part.type === 'tool') {
      const last = out[out.length - 1]
      if (last?.kind === 'tools') last.steps.push(part)
      else out.push({ kind: 'tools', steps: [part] })
    } else if (
      part.type === 'text' ||
      part.type === 'thinking' ||
      part.type === 'error' ||
      part.type === 'notice'
    ) {
      out.push({ kind: part.type, text: part.text ?? '' })
    }
  }
  return out
})

const isEmpty = computed(() => (hasParts.value ? !props.parts?.length : !props.content))
const truncated = computed(() => Boolean(props.parts?.some((p) => p.type === 'notice')))
const openImage = ref<string | null>(null)

// reasoning that is still streaming stays open; closed ones can be toggled
function isThinkingOpen(index: number) {
  if (closedThinking.value.includes(index)) return false
  if (openThinking.value.includes(index)) return true
  return Boolean(props.pending) && index === segments.value.length - 1
}

function toggleThinking(index: number) {
  if (isThinkingOpen(index)) {
    openThinking.value = openThinking.value.filter((i) => i !== index)
    closedThinking.value = [...closedThinking.value, index]
  } else {
    closedThinking.value = closedThinking.value.filter((i) => i !== index)
    openThinking.value = [...openThinking.value, index]
  }
}

function formatDuration(ms: number) {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
}

const statsLabel = computed(() => {
  const s = props.stats
  if (!s) return ''
  const items = [
    `${s.numTurns} ${s.numTurns === 1 ? 'turn' : 'turns'}`,
    formatDuration(s.durationMs)
  ]
  if (s.usage) {
    const input = s.usage.inputTokens + s.usage.cacheReadTokens + s.usage.cacheCreationTokens
    items.push(`${formatTokens(input)} in / ${formatTokens(s.usage.outputTokens)} out`)
  }
  if (s.interrupted) items.push('stopped')
  return items.join(' · ')
})

const statsTitle = computed(() => {
  const u = props.stats?.usage
  if (!u) return undefined
  return `Input ${u.inputTokens} · cache read ${u.cacheReadTokens} · cache write ${u.cacheCreationTokens} · output ${u.outputTokens}`
})

async function copyAnswer() {
  try {
    await navigator.clipboard.writeText(props.content)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // clipboard unavailable
  }
}
</script>

<template>
  <div v-if="isUser" class="msg msg--user">
    <div class="msg__user">
      <div v-if="attachments?.length" class="msg__images">
        <button
          v-for="(image, index) in attachments"
          :key="index"
          type="button"
          class="msg__image"
          :aria-label="`Open ${image.name || 'image'}`"
          @click="openImage = attachmentUrl(image)"
        >
          <img :src="attachmentUrl(image)" :alt="image.name || 'Attached image'" loading="lazy" />
        </button>
      </div>
      <div v-if="content" class="msg__bubble">
        {{ userText }}
        <button
          v-if="userCollapsible"
          type="button"
          class="msg__more"
          @click="userExpanded = !userExpanded"
        >
          {{ userExpanded ? 'Show less' : 'Show more' }}
        </button>
      </div>
      <div class="msg__user-actions">
        <button
          type="button"
          class="ui-icon-btn ui-icon-btn--danger msg__action"
          aria-label="Delete question and answer"
          title="Delete this question and its answer"
          :disabled="!deletable"
          @click="emit('delete')"
        >
          <Icon name="lucide:trash-2" />
        </button>
      </div>
    </div>

    <UModal
      :open="Boolean(openImage)"
      title="Image"
      :ui="{ content: 'max-w-5xl' }"
      @update:open="(open: boolean) => !open && (openImage = null)"
    >
      <template #body>
        <img v-if="openImage" :src="openImage" alt="Attached image" class="msg__image-full" />
      </template>
    </UModal>
  </div>

  <article v-else class="msg msg--assistant" :aria-busy="pending">
    <div class="msg__author">
      <span class="msg__avatar">
        <Icon :name="isAgent ? 'lucide:terminal' : 'lucide:sparkle'" />
      </span>
      <span class="msg__name">{{ isAgent ? 'Agent' : 'Assistant' }}</span>
    </div>

    <template v-for="(segment, index) in segments" :key="index">
      <MessageMarkdown v-if="segment.kind === 'text' && segment.text" :content="segment.text" />

      <div v-else-if="segment.kind === 'thinking'" class="msg__thinking">
        <button
          type="button"
          class="msg__thinking-toggle"
          :aria-expanded="isThinkingOpen(index)"
          @click="toggleThinking(index)"
        >
          <Icon name="lucide:lightbulb" />
          {{ pending && index === segments.length - 1 ? 'Thinking…' : 'Thinking' }}
          <Icon
            name="lucide:chevron-right"
            class="msg__thinking-chevron"
            :class="{ 'rotate-90': isThinkingOpen(index) }"
          />
        </button>
        <div v-if="isThinkingOpen(index)" class="msg__thinking-text">{{ segment.text }}</div>
      </div>

      <AgentStepsGroup
        v-else-if="segment.kind === 'tools'"
        :steps="segment.steps"
        :live="pending"
      />

      <div v-else-if="segment.kind === 'error'" class="msg__error" role="alert">
        <Icon name="lucide:circle-alert" class="flex-none" />
        <span>{{ segment.text }}</span>
      </div>

      <div v-else-if="segment.kind === 'notice'" class="msg__notice" role="status">
        <Icon name="lucide:scissors" class="flex-none" />
        <span class="flex-1">{{ segment.text }}</span>
        <button
          v-if="last && truncated && !pending"
          type="button"
          class="ui-btn ui-btn--tinted ui-btn--sm"
          :disabled="!deletable"
          @click="emit('continue')"
        >
          Continue
        </button>
      </div>
    </template>

    <div v-if="pending && (isEmpty || status)" class="msg__pending">
      <span class="msg__dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span>{{ status || (isAgent ? 'Working…' : 'Thinking…') }}</span>
    </div>

    <div v-if="!pending" class="msg__footer">
      <button
        v-if="content"
        type="button"
        class="ui-icon-btn msg__action"
        :aria-label="copied ? 'Copied' : 'Copy answer'"
        :title="copied ? 'Copied' : 'Copy answer'"
        @click="copyAnswer"
      >
        <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" />
      </button>
      <button
        type="button"
        class="ui-icon-btn ui-icon-btn--danger msg__action"
        aria-label="Delete answer"
        title="Delete this answer"
        :disabled="!deletable"
        @click="emit('delete')"
      >
        <Icon name="lucide:trash-2" />
      </button>
      <span v-if="statsLabel" class="msg__stats" :title="statsTitle">{{ statsLabel }}</span>
    </div>
  </article>
</template>

<style scoped>
@import 'tailwindcss/theme';

.msg--user {
  @apply flex justify-end;
}

.msg__user {
  @apply flex max-w-[78%] flex-col items-end gap-1.5 max-sm:max-w-[88%];
}

.msg__user-actions {
  @apply -mr-1 flex opacity-0 transition-opacity;
}

.msg--user:hover .msg__user-actions,
.msg--user:focus-within .msg__user-actions {
  @apply opacity-100;
}

@media (hover: none) {
  .msg__user-actions {
    @apply opacity-100;
  }
}

.msg__images {
  @apply flex flex-wrap justify-end gap-1.5;
}

.msg__image {
  @apply h-28 max-w-[220px] cursor-zoom-in overflow-hidden rounded-[12px] border-0 p-0;
  background: var(--c-surface-2);
}

.msg__image img {
  @apply h-full w-auto object-cover;
}

.msg__image-full {
  @apply mx-auto max-h-[80vh] w-auto rounded-[10px];
}

.msg--user .msg__bubble {
  @apply px-3.5 py-2.5 text-[15px] leading-[1.45] break-words whitespace-pre-wrap;
  border-radius: 18px 18px 6px 18px;
  background: var(--c-surface-2);
  color: var(--c-text);
  overflow-wrap: anywhere;
}

.msg__more {
  @apply mt-1 block cursor-pointer border-0 bg-transparent p-0 text-[13px];
  color: var(--c-accent);
}

.msg--assistant {
  @apply flex min-w-0 flex-col gap-3;
}

.msg__author {
  @apply flex items-center gap-2;
}

.msg__avatar {
  @apply flex h-6 w-6 items-center justify-center rounded-[7px] text-xs;
  background: var(--c-surface-2);
  border: 1px solid var(--c-sep-strong);
  color: var(--c-accent);
}

.msg__name {
  @apply text-[13px] font-semibold;
  color: var(--c-text);
}

.msg__thinking {
  @apply flex flex-col gap-2;
}

.msg__thinking-toggle {
  @apply inline-flex h-[26px] cursor-pointer items-center gap-1.5 self-start rounded-full bg-transparent pr-2.5 pl-2 text-xs transition-colors;
  border: 1px solid var(--c-sep);
  color: var(--c-text-3);
}

.msg__thinking-toggle:hover {
  background: var(--c-hover);
  color: var(--c-text-2);
}

.msg__thinking-chevron {
  @apply text-xs transition-transform;
}

.msg__thinking-text {
  @apply max-h-80 overflow-auto pl-3 text-[13px] leading-relaxed whitespace-pre-wrap;
  border-left: 2px solid var(--c-surface-3);
  color: var(--c-text-3);
}

.msg__error {
  @apply flex items-start gap-2 px-3.5 py-2.5 text-sm;
  border-radius: var(--r-md);
  background: var(--c-danger-soft);
  border: 1px solid rgba(255, 105, 97, 0.25);
  color: #ffb4ae;
}

.msg__notice {
  @apply flex items-center gap-2 px-3.5 py-2.5 text-sm;
  border-radius: var(--r-md);
  background: rgba(255, 196, 0, 0.08);
  border: 1px solid rgba(255, 196, 0, 0.25);
  color: #f5d77a;
}

.msg__pending {
  @apply flex items-center gap-2.5 text-[13px];
  color: var(--c-text-3);
}

.msg__dots {
  @apply inline-flex gap-1;
}

.msg__dots i {
  @apply h-1.5 w-1.5 rounded-full;
  background: var(--c-accent);
  animation: msg-dot 1.2s infinite ease-in-out;
}

.msg__dots i:nth-child(2) {
  animation-delay: 0.15s;
}

.msg__dots i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes msg-dot {
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: scale(0.85);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

.msg__footer {
  @apply -mt-1 -ml-1.5 flex items-center gap-1 text-xs;
  color: var(--c-text-4);
}

.msg__action {
  @apply h-[30px] w-[30px] text-[15px];
  color: var(--c-text-4);
}

.msg__stats {
  @apply ml-1.5;
}
</style>
