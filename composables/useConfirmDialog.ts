import { ref } from 'vue'

const isOpen = ref(false)
const title = ref('')
const subtitle = ref('')
let resolveFn: (result: boolean) => void

export function useConfirmDialog() {
  const confirm = (titleArg: string, subtitleArg?: string): Promise<boolean> => {
    title.value = titleArg
    subtitle.value = subtitleArg || ''
    isOpen.value = true

    return new Promise((resolve) => {
      resolveFn = resolve
    })
  }

  const confirmYes = () => {
    isOpen.value = false
    resolveFn(true)
  }

  const confirmNo = () => {
    isOpen.value = false
    resolveFn(false)
  }

  return {
    isOpen,
    title,
    subtitle,
    confirm,
    confirmYes,
    confirmNo
  }
}
