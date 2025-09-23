<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useConfirmDialog } from '~/composables/useConfirmDialog'

const router = useRouter()
const { confirm } = useConfirmDialog()

const spacesStore = useSpacesStore()
const { spaces, loading } = storeToRefs(spacesStore)

const newSpaceName = ref('')
const creating = ref(false)

await useAsyncData('spaces', async () => {
  await spacesStore.fetchSpaces(1000)
  return spacesStore.spaces
})

async function deleteSpace(id: string) {
  const ok = await confirm(
    'Remove space',
    'This action cannot be undone. Are you sure you want to proceed?'
  )
  if (ok) {
    await spacesStore.deleteSpace(id)
  }
}

function toggleCreate() {
  creating.value = !creating.value
  newSpaceName.value = ''
}

async function createSpace() {
  if (!newSpaceName.value.trim()) return
  await spacesStore.createSpace({ name: newSpaceName.value.trim() })
  toggleCreate()
}
</script>

<template>
  <div class="spaces">
    <div class="spaces__header">
      <h1 class="spaces__title">Spaces</h1>
      <UButton color="primary" variant="solid" size="sm" @click="toggleCreate">
        <Icon name="material-symbols:add" class="mr-1" /> Create
      </UButton>
    </div>

    <div v-if="creating" class="spaces__create">
      <input
        v-model="newSpaceName"
        type="text"
        placeholder="Enter space name"
        class="spaces__input"
      />
      <UButton color="neutral" variant="solid" size="sm" :loading="loading" @click="createSpace">
        Save
      </UButton>
      <UButton color="neutral" variant="soft" size="sm" @click="toggleCreate">Cancel</UButton>
    </div>

    <!-- Скелетоны при загрузке -->
    <ul v-if="loading" class="spaces__list">
      <li v-for="n in 3" :key="n" class="spaces__item">
        <USkeleton class="h-5 w-32 rounded bg-gray-700/50 animate-pulse" />
        <USkeleton class="h-5 w-6 rounded bg-gray-700/50 animate-pulse" />
      </li>
    </ul>

    <!-- Список -->
    <ul v-else class="spaces__list">
      <li
        v-for="s in spaces"
        :key="s.id"
        class="spaces__item"
        @click="router.push({ name: 'spaces-id', params: { id: s.id } })"
      >
        <span class="spaces__name">{{ s.name }}</span>
        <div class="spaces__actions">
          <button class="spaces__delete" @click.stop="deleteSpace(s.id)">
            <Icon name="material-symbols:delete-outline" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.spaces {
  padding: 1.5rem;
}

.spaces__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.spaces__title {
  font-size: 1.5rem;
  font-weight: bold;
}

.spaces__create {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
  background: #1e1e1e;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}

.spaces__input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #333;
  background: #111;
  color: #fff;
  outline: none;
}

.spaces__input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px #2563eb55;
}

.spaces__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.spaces__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #1e1e1e;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s;
  cursor: pointer;
}

.spaces__item:hover {
  background: #2a2a2a;
}

.spaces__name {
  font-size: 1rem;
}

.spaces__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.spaces__delete {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
}

.spaces__delete:hover {
  color: #f55;
}
</style>
