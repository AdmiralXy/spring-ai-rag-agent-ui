<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNewChat } from '~/composables/useNewChat'

const MAX_SPACES = 5

const spacesStore = useSpacesStore()
const chatsStore = useChatsStore()
const { dialogOpen, createWithSpaces } = useNewChat()

const selected = ref<string[]>([])
const filter = ref('')

const visibleSpaces = computed(() => {
  const q = filter.value.trim().toLowerCase()
  return q ? spacesStore.spaces.filter((s) => s.name.toLowerCase().includes(q)) : spacesStore.spaces
})

watch(dialogOpen, (open) => {
  if (open) {
    selected.value = []
    filter.value = ''
  }
})

function toggle(id: string) {
  if (selected.value.includes(id)) {
    selected.value = selected.value.filter((s) => s !== id)
  } else if (selected.value.length < MAX_SPACES) {
    selected.value = [...selected.value, id]
  }
}

async function start() {
  await createWithSpaces([...selected.value])
}
</script>

<template>
  <UModal
    v-model:open="dialogOpen"
    title="New chat"
    description="Pick knowledge spaces the assistant should search. You can also start without any."
    :ui="{ content: 'max-w-md' }"
  >
    <template #body>
      <div class="new-chat">
        <input
          v-if="spacesStore.spaces.length > 6"
          v-model="filter"
          type="search"
          class="ui-input"
          placeholder="Filter spaces"
          aria-label="Filter spaces"
        />
        <div class="ui-group new-chat__list">
          <button
            v-for="space in visibleSpaces"
            :key="space.id"
            type="button"
            class="ui-group-row"
            role="checkbox"
            :aria-checked="selected.includes(space.id)"
            :disabled="!selected.includes(space.id) && selected.length >= MAX_SPACES"
            @click="toggle(space.id)"
          >
            <Icon name="lucide:layers" class="new-chat__icon" />
            <span class="new-chat__name">{{ space.name }}</span>
            <span
              class="new-chat__check"
              :class="{ 'new-chat__check--on': selected.includes(space.id) }"
            >
              <Icon v-if="selected.includes(space.id)" name="lucide:check" />
            </span>
          </button>
          <div v-if="!visibleSpaces.length" class="ui-group-row new-chat__none">
            No spaces match
          </div>
        </div>
        <p class="ui-hint">{{ selected.length }} of {{ MAX_SPACES }} selected</p>
      </div>
    </template>
    <template #footer>
      <div class="new-chat__actions">
        <button type="button" class="ui-btn ui-btn--ghost" @click="dialogOpen = false">
          Cancel
        </button>
        <button
          type="button"
          class="ui-btn ui-btn--primary"
          :disabled="chatsStore.loading"
          @click="start"
        >
          {{ selected.length ? 'Start chat' : 'Start without spaces' }}
        </button>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
@import 'tailwindcss/theme';

.new-chat {
  @apply flex flex-col gap-3;
}

.new-chat__list {
  @apply max-h-80 overflow-y-auto;
}

.new-chat__icon {
  @apply flex-none text-base;
  color: var(--c-text-3);
}

.new-chat__name {
  @apply min-w-0 flex-1 truncate text-sm;
}

.new-chat__check {
  @apply flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[13px];
  border: 1.5px solid var(--c-surface-4);
}

.new-chat__check--on {
  border-color: var(--c-accent-fill);
  background: var(--c-accent-fill);
  color: #fff;
}

button.ui-group-row:disabled {
  @apply cursor-not-allowed opacity-40;
}

.new-chat__none {
  @apply text-sm;
  color: var(--c-text-4);
}

.new-chat__actions {
  @apply flex w-full justify-end gap-2;
}
</style>
