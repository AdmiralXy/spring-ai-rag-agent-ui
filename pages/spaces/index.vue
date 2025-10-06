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
  <LayoutWrapper title="Spaces">
    <template #header-actions>
      <UButton color="primary" variant="solid" size="sm" @click="toggleCreate">
        <Icon name="material-symbols:add" class="mr-1" /> Create
      </UButton>
    </template>

    <div v-if="creating" class="spaces__create">
      <input v-model="newSpaceName" type="text" placeholder="Space name" class="spaces__input" />
      <div class="spaces__input__buttons">
        <UButton
          icon="material-symbols:check"
          color="primary"
          variant="solid"
          size="sm"
          :loading="loading"
          @click="createSpace"
        >
          Save
        </UButton>
        <UButton
          icon="material-symbols:close"
          color="neutral"
          variant="outline"
          :ui="{
            base: 'bg-transparent'
          }"
          size="sm"
          @click="toggleCreate"
        >
          Cancel
        </UButton>
      </div>
    </div>

    <ul v-if="loading" class="spaces__list">
      <li v-for="n in 3" :key="n" class="spaces__item">
        <USkeleton class="h-5 w-32 animate-pulse rounded bg-gray-700/50" />
        <USkeleton class="h-5 w-6 animate-pulse rounded bg-gray-700/50" />
      </li>
    </ul>

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
  </LayoutWrapper>
</template>

<style scoped>
@import 'tailwindcss/theme';

.spaces__create {
  @apply mb-4 flex w-full flex-wrap items-center gap-2 rounded-md bg-[#1e1e1e] p-3 max-lg:grid max-lg:gap-2;
}

.spaces__input {
  @apply min-w-[200px] flex-1 rounded-md border border-[#333] bg-[#111] px-3 py-2 text-white outline-none;
}

.spaces__input:focus {
  @apply border-blue-500 ring-2 ring-blue-500/30;
}

.spaces__input__buttons {
  @apply flex gap-2;
}

.spaces__list {
  @apply flex flex-1 flex-col gap-2 overflow-y-auto scroll-smooth pr-1;
}

.spaces__item {
  @apply flex cursor-pointer items-center justify-between rounded-md bg-[#1e1e1e] p-3 transition-colors duration-200;
}

.spaces__item:hover {
  @apply bg-[#2a2a2a];
}

.spaces__name {
  @apply text-base text-gray-100;
}

.spaces__actions {
  @apply flex items-center gap-2;
}

.spaces__delete {
  @apply cursor-pointer border-none bg-transparent p-1 text-[1.2rem] text-gray-400 transition-colors duration-200;
}

.spaces__delete:hover {
  @apply text-red-500;
}
</style>
