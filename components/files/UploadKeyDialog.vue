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
    :ui="{
      overlay: 'bg-[#272727ED]',
      content: 'bg-[#171717] border-none !divide-none !ring-0 !shadow-none'
    }"
    @update:open="onOpenChange"
  >
    <template #body>
      <form class="upload-key" autocomplete="off" @submit.prevent="submit">
        <div class="upload-key__field">
          <input
            ref="inputRef"
            v-model="password"
            :type="reveal ? 'text' : 'password'"
            class="upload-key__input"
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
            <Icon
              :name="
                reveal
                  ? 'material-symbols:visibility-off-outline'
                  : 'material-symbols:visibility-outline'
              "
            />
          </button>
        </div>
        <p v-if="props.error" class="upload-key__error">{{ props.error }}</p>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton variant="solid" :disabled="!password" @click="submit">Continue</UButton>
        <UButton color="neutral" variant="solid" @click="cancel">Cancel</UButton>
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
  @apply w-full rounded-md border border-[#3d3d3d] bg-[#111] py-2 pr-10 pl-3 text-white outline-none;
}

.upload-key__input:focus {
  @apply border-blue-500 ring-2 ring-blue-500/30;
}

.upload-key__reveal {
  @apply absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer p-1 text-lg text-gray-400 hover:text-white;
}

.upload-key__error {
  @apply text-sm text-red-400;
}
</style>
