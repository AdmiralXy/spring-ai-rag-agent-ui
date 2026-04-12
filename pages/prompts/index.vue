<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useConfirmDialog } from '~/composables/useConfirmDialog'
import { usePromptTemplatesStore } from '~/stores/usePromptTemplatesStore'

const { confirm } = useConfirmDialog()
const promptsStore = usePromptTemplatesStore()
const { templates, loading } = storeToRefs(promptsStore)

const creating = ref(false)
const newName = ref('')
const newContent = ref('')
const editingId = ref<string | null>(null)
const editName = ref('')
const editContent = ref('')

await useAsyncData('prompt-templates', async () => {
  await promptsStore.fetchPromptTemplates()
  return promptsStore.templates
})

function resetCreateForm() {
  creating.value = false
  newName.value = ''
  newContent.value = ''
}

function toggleCreate() {
  creating.value = !creating.value
  if (!creating.value) {
    newName.value = ''
    newContent.value = ''
  }
}

async function createTemplate() {
  const name = newName.value.trim()
  const content = newContent.value.trim()
  if (!name || !content) return

  await promptsStore.createPromptTemplate({ name, content })
  resetCreateForm()
}

function startEdit(template: PromptTemplate) {
  editingId.value = template.id
  editName.value = template.name
  editContent.value = template.content
}

function cancelEdit() {
  editingId.value = null
  editName.value = ''
  editContent.value = ''
}

async function saveEdit(id: string) {
  const name = editName.value.trim()
  const content = editContent.value.trim()
  if (!name || !content) return

  const updated = await promptsStore.updatePromptTemplate(id, { name, content })
  if (!updated) return
  cancelEdit()
}

async function removeTemplate(id: string) {
  const ok = await confirm('Remove prompt template', 'This action cannot be undone.')
  if (!ok) return

  await promptsStore.deletePromptTemplate(id)
  if (editingId.value === id) {
    cancelEdit()
  }
}
</script>

<template>
  <LayoutWrapper title="Prompts">
    <template #header-actions>
      <UButton color="primary" variant="solid" size="sm" @click="toggleCreate">
        <Icon name="material-symbols:add" class="mr-1" />
        {{ creating ? 'Cancel' : 'Create' }}
      </UButton>
    </template>

    <div v-if="creating" class="prompts__create">
      <input v-model="newName" type="text" placeholder="Prompt name" class="prompts__input" />
      <textarea
        v-model="newContent"
        rows="5"
        placeholder="Prompt content"
        class="prompts__textarea"
      />
      <div class="prompts__create-actions">
        <UButton
          color="primary"
          variant="solid"
          size="sm"
          :loading="loading"
          @click="createTemplate"
        >
          Save
        </UButton>
        <UButton color="neutral" variant="outline" size="sm" @click="resetCreateForm"
          >Cancel</UButton
        >
      </div>
    </div>

    <ul v-if="loading && !templates.length" class="prompts__list">
      <li v-for="n in 3" :key="n" class="prompts__item">
        <USkeleton class="h-5 w-48 animate-pulse rounded bg-gray-700/50" />
        <USkeleton class="h-20 w-full animate-pulse rounded bg-gray-700/50" />
      </li>
    </ul>

    <div v-else-if="!templates.length" class="prompts__empty">No templates yet.</div>

    <ul v-else class="prompts__list">
      <li v-for="template in templates" :key="template.id" class="prompts__item">
        <template v-if="editingId === template.id">
          <input v-model="editName" type="text" class="prompts__input" />
          <textarea v-model="editContent" rows="5" class="prompts__textarea" />
          <div class="prompts__actions">
            <UButton
              color="primary"
              variant="solid"
              size="sm"
              :loading="loading"
              @click="saveEdit(template.id)"
            >
              Save
            </UButton>
            <UButton color="neutral" variant="outline" size="sm" @click="cancelEdit"
              >Cancel</UButton
            >
            <UButton
              color="error"
              variant="soft"
              size="sm"
              :loading="loading"
              @click="removeTemplate(template.id)"
            >
              Delete
            </UButton>
          </div>
        </template>

        <template v-else>
          <div class="prompts__item-head">
            <h3 class="prompts__title">{{ template.name }}</h3>
            <div class="prompts__actions">
              <UButton color="neutral" variant="soft" size="xs" @click="startEdit(template)"
                >Edit</UButton
              >
              <UButton color="error" variant="soft" size="xs" @click="removeTemplate(template.id)">
                Delete
              </UButton>
            </div>
          </div>
          <p class="prompts__content">{{ template.content }}</p>
        </template>
      </li>
    </ul>
  </LayoutWrapper>
</template>

<style scoped>
@import 'tailwindcss/theme';

.prompts__create,
.prompts__item {
  @apply mb-3 flex flex-col gap-3 rounded-lg border border-[#333] bg-[#1e1e1e] p-3;
}

.prompts__list {
  @apply flex flex-col gap-2;
}

.prompts__item-head {
  @apply flex items-start justify-between gap-3;
}

.prompts__title {
  @apply text-base font-semibold text-white;
}

.prompts__content {
  @apply text-sm leading-relaxed whitespace-pre-wrap text-gray-300;
}

.prompts__input,
.prompts__textarea {
  @apply w-full rounded-md border border-[#3d3d3d] bg-[#111] px-3 py-2 text-white outline-none;
}

.prompts__input:focus,
.prompts__textarea:focus {
  @apply border-blue-500 ring-2 ring-blue-500/30;
}

.prompts__actions,
.prompts__create-actions {
  @apply flex flex-wrap gap-2;
}

.prompts__empty {
  @apply rounded-lg border border-dashed border-[#3a3a3a] bg-[#1b1b1b] p-5 text-sm text-gray-400;
}
</style>
