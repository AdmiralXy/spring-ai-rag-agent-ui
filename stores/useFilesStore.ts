import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'

const DEFAULT_PAGE_SIZE = 20

export const useFilesStore = defineStore('files', {
  state: () => ({
    files: [] as FileRs[],
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    loading: false
  }),

  actions: {
    /** Fetch a page of files (0-based). Falls back to the previous page if the requested one is empty. */
    async fetchFiles(requestedPage?: number) {
      let page = requestedPage ?? this.page
      this.loading = true
      try {
        const api = useApi()
        let res = await api.get<GetFilesRs>('/files', { query: { page, size: this.size } })

        if (!res.files.content.length && page > 0 && res.files.page.totalPages > 0) {
          page = Math.min(page - 1, res.files.page.totalPages - 1)
          res = await api.get<GetFilesRs>('/files', { query: { page, size: this.size } })
        }

        this.files = res.files.content
        this.page = res.files.page.number
        this.totalElements = res.files.page.totalElements
        this.totalPages = res.files.page.totalPages
        return this.files
      } finally {
        this.loading = false
      }
    },

    async downloadFile(file: Pick<FileRs, 'id' | 'fileName'>) {
      const api = useApi()
      const blob = await api.get<Blob>(`/files/${file.id}`, { responseType: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = Object.assign(document.createElement('a'), {
        href: url,
        download: file.fileName
      })
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
    },

    async deleteFile(id: string) {
      const api = useApi()
      await api.del(`/files/${id}`)
      await this.fetchFiles()
    }
  }
})
