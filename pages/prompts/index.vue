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
  <LayoutWrapper title="Prompts" subtitle="Reusable messages for the composer">
    <template #header-actions>
      <button
        type="button"
        class="ui-btn"
        :class="creating ? 'ui-btn--secondary' : 'ui-btn--primary'"
        @click="toggleCreate"
      >
        <Icon :name="creating ? 'lucide:x' : 'lucide:plus'" />
        {{ creating ? 'Cancel' : 'New prompt' }}
      </button>
    </template>

    <form v-if="creating" class="ui-card prompts__editor" @submit.prevent="createTemplate">
      <label for="prompt-new-name" class="ui-section-label">Name</label>
      <input
        id="prompt-new-name"
        v-model="newName"
        type="text"
        placeholder="e.g. Code review"
        class="ui-input"
      />
      <label for="prompt-new-content" class="ui-section-label">Content</label>
      <textarea
        id="prompt-new-content"
        v-model="newContent"
        rows="6"
        placeholder="The message inserted into the composer"
        class="ui-input"
      />
      <div class="prompts__actions">
        <button
          type="submit"
          class="ui-btn ui-btn--primary"
          :disabled="!newName.trim() || !newContent.trim() || loading"
        >
          Save
        </button>
        <button type="button" class="ui-btn ui-btn--secondary" @click="resetCreateForm">
          Cancel
        </button>
      </div>
    </form>

    <div v-if="loading && !templates.length" class="prompts__list">
      <div v-for="n in 3" :key="n" class="ui-card prompts__card">
        <USkeleton class="h-4 w-48 rounded" />
        <USkeleton class="h-16 w-full rounded" />
      </div>
    </div>

    <div v-else-if="!templates.length && !creating" class="ui-empty">
      <Icon name="lucide:file-text" class="ui-empty__icon" />
      <p class="ui-empty__title">No prompts yet</p>
      <p class="text-sm">Save prompts you use often and insert them from the composer.</p>
    </div>

    <div v-else class="prompts__list">
      <article v-for="template in templates" :key="template.id" class="ui-card prompts__card">
        <form
          v-if="editingId === template.id"
          class="prompts__form"
          @submit.prevent="saveEdit(template.id)"
        >
          <label :for="`prompt-name-${template.id}`" class="ui-section-label">Name</label>
          <input
            :id="`prompt-name-${template.id}`"
            v-model="editName"
            type="text"
            class="ui-input"
          />
          <label :for="`prompt-content-${template.id}`" class="ui-section-label">Content</label>
          <textarea
            :id="`prompt-content-${template.id}`"
            v-model="editContent"
            rows="6"
            class="ui-input"
          />
          <div class="prompts__actions">
            <button type="submit" class="ui-btn ui-btn--primary" :disabled="loading">Save</button>
            <button type="button" class="ui-btn ui-btn--secondary" @click="cancelEdit">
              Cancel
            </button>
            <div class="flex-1"></div>
            <button
              type="button"
              class="ui-btn ui-btn--danger"
              :disabled="loading"
              @click="removeTemplate(template.id)"
            >
              Delete
            </button>
          </div>
        </form>

        <template v-else>
          <div class="prompts__head">
            <h2 class="prompts__title">{{ template.name }}</h2>
            <button
              type="button"
              class="ui-icon-btn"
              :aria-label="`Edit ${template.name}`"
              title="Edit"
              @click="startEdit(template)"
            >
              <Icon name="lucide:pencil" />
            </button>
            <button
              type="button"
              class="ui-icon-btn ui-icon-btn--danger"
              :aria-label="`Delete ${template.name}`"
              title="Delete"
              @click="removeTemplate(template.id)"
            >
              <Icon name="lucide:trash-2" />
            </button>
          </div>
          <p class="prompts__content">{{ template.content }}</p>
        </template>
      </article>
    </div>
  </LayoutWrapper>
</template>

<style scoped>
@import 'tailwindcss/theme';

.prompts__editor,
.prompts__form {
  @apply flex flex-col gap-2;
}

.prompts__editor {
  @apply p-4;
}

.prompts__list {
  @apply grid gap-3 md:grid-cols-2;
}

.prompts__card {
  @apply flex flex-col gap-2 p-4;
}

.prompts__head {
  @apply flex items-center gap-1;
}

.prompts__title {
  @apply m-0 min-w-0 flex-1 truncate text-[15px] font-semibold;
  color: var(--c-text);
}

.prompts__content {
  @apply m-0 line-clamp-5 text-sm leading-relaxed whitespace-pre-wrap;
  color: var(--c-text-3);
}

.prompts__actions {
  @apply mt-2 flex flex-wrap items-center gap-2;
}
</style>
