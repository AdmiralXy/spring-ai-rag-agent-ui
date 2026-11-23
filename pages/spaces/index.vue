<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useConfirmDialog } from '~/composables/useConfirmDialog'

const { confirm } = useConfirmDialog()
const spacesStore = useSpacesStore()
const { spaces, loading } = storeToRefs(spacesStore)

const newSpaceName = ref('')
const creating = ref(false)

useLazyAsyncData('spaces-page', async () => {
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
  <LayoutWrapper title="Spaces" subtitle="Knowledge bases the assistant can search">
    <template #header-actions>
      <button
        type="button"
        class="ui-btn"
        :class="creating ? 'ui-btn--secondary' : 'ui-btn--primary'"
        @click="toggleCreate"
      >
        <Icon :name="creating ? 'lucide:x' : 'lucide:plus'" />
        {{ creating ? 'Cancel' : 'New space' }}
      </button>
    </template>

    <form v-if="creating" class="spaces__create" @submit.prevent="createSpace">
      <label for="space-name" class="ui-sr-only">Space name</label>
      <input
        id="space-name"
        v-model="newSpaceName"
        type="text"
        placeholder="Space name"
        class="ui-input"
        autofocus
      />
      <button
        type="submit"
        class="ui-btn ui-btn--primary ui-btn--lg"
        :disabled="!newSpaceName.trim() || loading"
      >
        Create
      </button>
    </form>

    <div v-if="loading && !spaces.length" class="ui-group">
      <div v-for="n in 3" :key="n" class="ui-group-row">
        <USkeleton class="h-8 w-8 rounded-[9px]" />
        <USkeleton class="h-4 w-40 rounded" />
      </div>
    </div>

    <div v-else-if="!spaces.length" class="ui-empty">
      <Icon name="lucide:layers" class="ui-empty__icon" />
      <p class="ui-empty__title">No spaces yet</p>
      <p class="text-sm">
        Create a space and add text, files, Confluence pages or a Git repository.
      </p>
    </div>

    <div v-else class="ui-group">
      <div v-for="s in spaces" :key="s.id" class="spaces__row">
        <NuxtLink
          :to="{ name: 'spaces-id', params: { id: s.id } }"
          class="ui-group-row spaces__link"
        >
          <span class="spaces__icon"><Icon name="lucide:layers" /></span>
          <span class="spaces__name">{{ s.name }}</span>
          <Icon name="lucide:chevron-right" class="spaces__chevron" />
        </NuxtLink>
        <button
          type="button"
          class="ui-icon-btn ui-icon-btn--danger spaces__delete"
          :aria-label="`Delete ${s.name}`"
          title="Delete space"
          @click="deleteSpace(s.id)"
        >
          <Icon name="lucide:trash-2" />
        </button>
      </div>
    </div>
  </LayoutWrapper>
</template>

<style scoped>
@import 'tailwindcss/theme';

.spaces__create {
  @apply flex gap-2.5 max-sm:flex-col;
}

.spaces__row {
  @apply relative flex items-center;
}

.spaces__row + .spaces__row {
  border-top: 1px solid var(--c-sep);
}

.spaces__link {
  @apply min-h-[56px] flex-1 gap-3 pr-12;
}

.spaces__icon {
  @apply flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-[15px];
  background: var(--c-accent-soft);
  color: var(--c-accent-hover);
}

.spaces__name {
  @apply min-w-0 flex-1 truncate text-[15px];
}

.spaces__chevron {
  @apply flex-none;
  color: #636366;
}

.spaces__delete {
  @apply absolute right-9 opacity-0 transition-opacity;
}

.spaces__row:hover .spaces__delete,
.spaces__delete:focus-visible {
  @apply opacity-100;
}

@media (hover: none) {
  .spaces__delete {
    @apply opacity-100;
  }
}
</style>
