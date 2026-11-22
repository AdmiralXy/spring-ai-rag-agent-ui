<script setup lang="ts">
import { computed, nextTick, onMounted, onUpdated, ref, watch } from 'vue'
import useNotification from '~/composables/useNotification'
import { NotificationType } from '~/types/notification'
import { attachmentUrl, isImageFile, MAX_IMAGES, toImageAttachment } from '~/utils/images'

const emit = defineEmits<{
  send: [payload: { text: string; files: File[]; images: ChatAttachment[] }]
  stop: []
}>()
const props = withDefaults(
  defineProps<{
    loading?: boolean
    /** An answer is streaming and can be stopped */
    streaming?: boolean
    models?: ModelInfoRs[]
    promptTemplates?: PromptTemplate[]
  }>(),
  {
    models: () => [],
    promptTemplates: () => []
  }
)

const text = defineModel<string>('text', { default: '' })
const modelId = defineModel<string>('model', { default: '' })
const thinking = defineModel<ThinkingLevel>('thinking', { default: 'medium' })

const thinkingItems: Array<{ label: string; value: ThinkingLevel; description: string }> = [
  { label: 'Off', value: 'off', description: 'Answer right away' },
  { label: 'Low', value: 'low', description: 'Quick reasoning' },
  { label: 'Medium', value: 'medium', description: 'Balanced' },
  { label: 'High', value: 'high', description: 'Think it through' }
]

const files = ref<File[]>([])
const images = ref<ChatAttachment[]>([])
const dragging = ref(false)
const { notify } = useNotification()
const fileInputRef = ref<HTMLInputElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const formRef = ref<HTMLFormElement | null>(null)
const selectedPromptId = ref('')

const selectedModel = computed(() => props.models.find((m) => m.value === modelId.value))
const isAgent = computed(() => selectedModel.value?.provider === 'AGENT')
const supportsThinking = computed(() => Boolean(selectedModel.value?.thinking))
const supportsImages = computed(() => Boolean(selectedModel.value?.vision))
const thinkingLabel = computed(
  () => thinkingItems.find((item) => item.value === thinking.value)?.label ?? 'Medium'
)
const modelItems = computed(() =>
  props.models.map((m) => ({
    label: m.label,
    value: m.value,
    icon: m.provider === 'AGENT' ? 'lucide:terminal' : 'lucide:sparkles'
  }))
)
const promptItems = computed(() =>
  props.promptTemplates.map((template) => ({ label: template.name, value: template.id }))
)
const canSend = computed(
  () =>
    (Boolean(text.value.trim()) || files.value.length > 0 || images.value.length > 0) &&
    !props.loading
)

// images only go to models that accept them
watch(supportsImages, (supported) => {
  if (!supported && images.value.length) {
    images.value = []
    notify({
      type: NotificationType.WARNING,
      message: 'The selected model does not accept images, attached images were removed'
    })
  }
})

watch(selectedPromptId, (id) => {
  if (!id) return
  const selected = props.promptTemplates.find((template) => template.id === id)
  if (selected) text.value = selected.content
  selectedPromptId.value = ''
  void nextTick(() => {
    autosize()
    textareaRef.value?.focus()
  })
})

watch(text, () => nextTick(autosize))

function autosize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 240)}px`
}

function submit() {
  if (!canSend.value) return
  emit('send', { text: text.value, files: files.value, images: images.value })
  text.value = ''
  files.value = []
  images.value = []
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    submit()
  }
}

function openFileDialog() {
  if (props.loading) return
  fileInputRef.value?.click()
}

async function addFiles(picked: File[]) {
  const imageFiles = picked.filter(isImageFile)
  const textFiles = picked.filter((file) => !isImageFile(file))
  if (textFiles.length) files.value = [...files.value, ...textFiles]
  if (!imageFiles.length) return

  if (!supportsImages.value) {
    notify({
      type: NotificationType.WARNING,
      message:
        'This model does not accept images. Turn on “Images” in its settings if it supports them.'
    })
    return
  }
  for (const file of imageFiles) {
    if (images.value.length >= MAX_IMAGES) {
      notify({
        type: NotificationType.WARNING,
        message: `At most ${MAX_IMAGES} images per message`
      })
      break
    }
    try {
      images.value = [...images.value, await toImageAttachment(file)]
    } catch (err) {
      notify({
        type: NotificationType.ERROR,
        message: err instanceof Error ? err.message : 'Failed to read the image'
      })
    }
  }
}

function onFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  void addFiles(target.files ? Array.from(target.files) : [])
  target.value = ''
}

function removeFile(index: number) {
  files.value = files.value.filter((_, i) => i !== index)
}

function removeImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}

/** Screenshots pasted from the clipboard (Ctrl+V / Cmd+V) */
function onPaste(event: ClipboardEvent) {
  const pasted = Array.from(event.clipboardData?.items ?? [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file))
  if (!pasted.length) return
  event.preventDefault()
  void addFiles(pasted)
}

function onDragOver(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files')) return
  event.preventDefault()
  dragging.value = true
}

function onDrop(event: DragEvent) {
  dragging.value = false
  const dropped = Array.from(event.dataTransfer?.files ?? [])
  if (!dropped.length) return
  event.preventDefault()
  void addFiles(dropped)
}

/**
 * The select menus' trigger buttons get a fixed "Show popup" label from reka-ui that hides their content
 * from screen readers, and Nuxt UI does not forward attributes to them: name them after each render.
 */
function labelTriggers() {
  const root = formRef.value
  if (!root) return
  const label = (selector: string, text: string) =>
    root.querySelector(selector)?.setAttribute('aria-label', text)
  label('.composer__pill--model', `Model: ${selectedModel.value?.label ?? 'not selected'}`)
  label(
    '.composer__pill--thinking',
    `Thinking: ${thinking.value === 'off' ? 'off' : thinkingLabel.value}`
  )
  label('.composer__pill--templates', 'Insert prompt template')
}

onUpdated(labelTriggers)

onMounted(() => {
  labelTriggers()
  autosize()
  textareaRef.value?.focus()
})
</script>

<template>
  <form
    ref="formRef"
    class="composer"
    :class="{ 'composer--dragging': dragging }"
    @submit.prevent="submit"
    @dragover="onDragOver"
    @dragleave="dragging = false"
    @drop="onDrop"
  >
    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="ui-sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="onFileInputChange"
    />

    <div v-if="images.length" class="composer__images">
      <span v-for="(image, index) in images" :key="index" class="composer__image">
        <img :src="attachmentUrl(image)" :alt="image.name || 'Attached image'" />
        <button
          type="button"
          class="composer__image-remove"
          :aria-label="`Remove ${image.name || 'image'}`"
          @click="removeImage(index)"
        >
          <Icon name="lucide:x" />
        </button>
      </span>
    </div>

    <div v-if="files.length" class="composer__files">
      <span v-for="(file, index) in files" :key="`${file.name}-${index}`" class="composer__file">
        <Icon name="lucide:file-text" />
        <span class="composer__file-name">{{ file.name }}</span>
        <button
          type="button"
          class="composer__file-remove"
          :aria-label="`Remove ${file.name}`"
          @click="removeFile(index)"
        >
          <Icon name="lucide:x" />
        </button>
      </span>
    </div>

    <label for="composer-input" class="ui-sr-only">Message</label>
    <textarea
      id="composer-input"
      ref="textareaRef"
      v-model="text"
      rows="1"
      class="composer__input"
      :placeholder="isAgent ? 'Ask the agent to build, run or check something…' : 'Message…'"
      @keydown="onKeydown"
      @paste="onPaste"
    />

    <div class="composer__bar">
      <button
        type="button"
        class="composer__icon-btn"
        aria-label="Attach files"
        :title="
          supportsImages
            ? 'Attach text files or images (you can also paste screenshots)'
            : 'Attach text files'
        "
        :disabled="loading"
        @click="openFileDialog"
      >
        <Icon name="lucide:paperclip" />
      </button>

      <USelectMenu
        v-if="modelItems.length"
        v-model="modelId"
        :items="modelItems"
        value-key="value"
        label-key="label"
        :search-input="modelItems.length > 8 ? { placeholder: 'Search models' } : false"
        variant="none"
        :ui="{
          base: 'composer__pill composer__pill--model',
          value: 'text-[13px] text-[#f5f5f7]',
          trailingIcon: 'text-[#a1a1a6] size-3.5'
        }"
      >
        <template #leading>
          <Icon
            :name="isAgent ? 'lucide:terminal' : 'lucide:sparkles'"
            class="composer__pill-icon"
            aria-hidden="true"
          />
        </template>
      </USelectMenu>

      <USelectMenu
        v-if="supportsThinking"
        v-model="thinking"
        :items="thinkingItems"
        value-key="value"
        label-key="label"
        :search-input="false"
        variant="none"
        :ui="{
          base: 'composer__pill composer__pill--thinking',
          value: 'text-[13px]',
          trailingIcon: 'text-[#a1a1a6] size-3.5'
        }"
      >
        <template #leading>
          <Icon
            name="lucide:brain"
            class="composer__pill-icon"
            :class="{ 'composer__pill-icon--muted': thinking === 'off' }"
            aria-hidden="true"
          />
        </template>
        <template #item-label="{ item }">
          <span class="composer__thinking-item">
            <span>{{ item.label }}</span>
            <span class="composer__thinking-hint">{{ item.description }}</span>
          </span>
        </template>
        <template #default>
          <span
            class="composer__thinking-value"
            :class="{ 'composer__thinking-value--off': thinking === 'off' }"
          >
            {{ thinking === 'off' ? 'Thinking off' : thinkingLabel }}
          </span>
        </template>
      </USelectMenu>

      <USelectMenu
        v-if="promptItems.length"
        v-model="selectedPromptId"
        :items="promptItems"
        value-key="value"
        label-key="label"
        variant="none"
        placeholder="Templates"
        :search-input="promptItems.length > 8 ? { placeholder: 'Search templates' } : false"
        :ui="{
          base: 'composer__pill composer__pill--ghost composer__pill--templates max-sm:!hidden',
          placeholder: 'text-[13px] text-[#a1a1a6]',
          trailingIcon: 'hidden'
        }"
      >
        <template #leading>
          <Icon
            name="lucide:file-text"
            class="composer__pill-icon composer__pill-icon--muted"
            aria-hidden="true"
          />
        </template>
      </USelectMenu>

      <div class="flex-1"></div>

      <button
        v-if="streaming"
        type="button"
        class="composer__send composer__send--stop"
        aria-label="Stop"
        title="Stop"
        @click="emit('stop')"
      >
        <Icon name="lucide:square" />
      </button>
      <button
        v-else
        type="submit"
        class="composer__send"
        aria-label="Send"
        title="Send (Enter)"
        :disabled="!canSend"
      >
        <Icon v-if="!loading" name="lucide:arrow-up" />
        <Icon v-else name="lucide:loader-circle" class="animate-spin" />
      </button>
    </div>
  </form>
</template>

<style scoped>
@import 'tailwindcss/theme';

.composer {
  @apply mx-auto flex w-full max-w-[760px] flex-col gap-2 px-3.5 pt-3 pb-2.5;
  border-radius: var(--r-xl);
  background: var(--c-surface-2);
  border: 1px solid var(--c-sep-strong);
  box-shadow: var(--shadow-pop);
  transition: border-color 0.2s;
}

.composer:focus-within {
  border-color: rgba(255, 255, 255, 0.18);
}

.composer--dragging {
  border-color: var(--c-accent);
}

.composer__images {
  @apply flex flex-wrap gap-2;
}

.composer__image {
  @apply relative h-16 w-16 flex-none overflow-hidden rounded-[10px];
  background: var(--c-surface-3);
  border: 1px solid var(--c-sep-strong);
}

.composer__image img {
  @apply h-full w-full object-cover;
}

.composer__image-remove {
  @apply absolute top-1 right-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-0 text-[11px];
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
}

.composer__files {
  @apply flex flex-wrap gap-1.5;
}

.composer__file {
  @apply inline-flex h-7 max-w-full items-center gap-1.5 rounded-full pr-1 pl-2.5 text-xs;
  background: var(--c-surface-3);
  color: var(--c-text-2);
}

.composer__file-name {
  @apply max-w-[220px] truncate;
}

.composer__file-remove {
  @apply flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-[11px];
  color: var(--c-text-3);
}

.composer__file-remove:hover {
  background: var(--c-surface-4);
  color: var(--c-text);
}

.composer__input {
  @apply w-full resize-none border-0 bg-transparent px-0.5 text-[15px] leading-[1.45] outline-none;
  color: var(--c-text);
  min-height: 24px;
  max-height: 240px;
}

.composer__input::placeholder {
  color: var(--c-text-4);
}

.composer__bar {
  @apply flex min-w-0 items-center gap-1.5;
}

.composer__icon-btn {
  @apply -ml-1 flex h-[34px] w-[34px] flex-none cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-lg transition-colors;
  color: var(--c-text-3);
}

.composer__icon-btn:hover:not(:disabled) {
  background: var(--c-hover);
  color: var(--c-text);
}

.composer__icon-btn:disabled {
  @apply cursor-not-allowed opacity-40;
}

:deep(.composer__pill) {
  @apply h-[30px] max-w-[240px] min-w-0 shrink cursor-pointer gap-1.5 rounded-full ps-8 pe-7 transition-colors max-sm:max-w-[200px];
  background: var(--c-surface-3);
  border: 1px solid var(--c-sep-strong);
}

:deep(.composer__pill:hover) {
  background: var(--c-surface-4);
}

:deep(.composer__pill--ghost) {
  @apply pe-3;
  background: transparent;
  border-color: transparent;
}

:deep(.composer__pill--ghost:hover) {
  background: var(--c-hover);
}

.composer__pill-icon {
  @apply ms-1 text-[13px];
  color: var(--c-accent);
}

.composer__pill-icon--muted {
  color: var(--c-text-3);
}

:deep(.composer__pill--thinking) {
  @apply max-w-[170px];
}

.composer__thinking-value {
  @apply truncate text-[13px];
  color: var(--c-text);
}

.composer__thinking-item {
  @apply flex flex-col leading-tight;
}

.composer__thinking-hint {
  @apply text-[11px];
  color: var(--c-text-4);
}

.composer__thinking-value--off {
  color: var(--c-text-3);
}

.composer__send {
  @apply flex h-[34px] w-[34px] flex-none cursor-pointer items-center justify-center rounded-full border-0 text-[17px] transition-colors;
  background: var(--c-accent-fill);
  color: #ffffff;
}

.composer__send:hover:not(:disabled) {
  background: var(--c-accent-fill-hover);
}

.composer__send:disabled {
  @apply cursor-not-allowed;
  background: var(--c-surface-4);
  color: var(--c-text-4);
}

.composer__send--stop {
  @apply text-[13px];
  background: var(--c-text);
  color: #000000;
}

.composer__send--stop:hover {
  background: #ffffff !important;
}

.composer__send--stop :deep(svg) {
  fill: currentColor;
}
</style>
