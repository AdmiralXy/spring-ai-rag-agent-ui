import { ref } from 'vue'

const dialogOpen = ref(false)

/**
 * Starts a new chat: opens the space picker when spaces exist, otherwise creates the chat right away.
 */
export function useNewChat() {
  const chatsStore = useChatsStore()
  const spacesStore = useSpacesStore()

  async function startNewChat() {
    if (!spacesStore.spaces.length) {
      await spacesStore.fetchSpaces(1000).catch(() => undefined)
    }
    if (spacesStore.spaces.length) {
      dialogOpen.value = true
      return
    }
    await chatsStore.createChat({ ragSpaces: [] })
  }

  async function createWithSpaces(ragSpaces: string[]) {
    dialogOpen.value = false
    await chatsStore.createChat({ ragSpaces })
  }

  return { dialogOpen, startNewChat, createWithSpaces }
}
