<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  error?: string
}>()

const emit = defineEmits<{
  submit: [password: string]
  cancel: []
}>()

const password = ref('')
const reveal = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    password.value = ''
    reveal.value = false
    if (open) {
      await nextTick()
      inputRef.value?.focus()
    }
  }
)

function submit() {
  const value = password.value
  // the field is cleared right away; the value is only used to derive a key
  password.value = ''
  if (!value) return
  emit('submit', value)
}

function cancel() {
  password.value = ''
  emit('cancel')
}

function onOpenChange(open: boolean) {
  if (!open) cancel()
}
</script>

<template>
  <UModal
    :open="props.open"
    title="Upload key"
    description="Folders are encrypted before upload. Enter the upload key you were given."
    :dismissible="true"
    :ui="{ content: 'max-w-sm' }"
    @update:open="onOpenChange"
  >
    <template #body>
      <form class="upload-key" autocomplete="off" @submit.prevent="submit">
        <div class="upload-key__field">
          <input
            ref="inputRef"
            v-model="password"
            :type="reveal ? 'text' : 'password'"
            class="ui-input upload-key__input"
            placeholder="Upload key"
            autocomplete="off"
            spellcheck="false"
            data-lpignore="true"
          />
          <button
            type="button"
            class="upload-key__reveal"
            :title="reveal ? 'Hide' : 'Show'"
            @click="reveal = !reveal"
          >
            <Icon :name="reveal ? 'lucide:eye-off' : 'lucide:eye'" />
          </button>
        </div>
        <p v-if="props.error" class="upload-key__error">{{ props.error }}</p>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <button type="button" class="ui-btn ui-btn--ghost" @click="cancel">Cancel</button>
        <button type="button" class="ui-btn ui-btn--primary" :disabled="!password" @click="submit">
          Continue
        </button>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
@import 'tailwindcss/theme';

.upload-key {
  @apply flex flex-col gap-2;
}

.upload-key__field {
  @apply relative;
}

.upload-key__input {
  @apply pr-10;
}

.upload-key__reveal {
  @apply absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent text-base;
  color: var(--c-text-3);
}

.upload-key__reveal:hover {
  background: var(--c-hover);
  color: var(--c-text);
}

.upload-key__error {
  @apply m-0 text-sm;
  color: var(--c-danger);
}
</style>
