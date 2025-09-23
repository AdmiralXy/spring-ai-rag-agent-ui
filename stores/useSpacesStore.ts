import { defineStore } from 'pinia'
import { useApi } from '~/composables/useApi'

export const useSpacesStore = defineStore('spaces', {
  state: () => ({
    spaces: [] as Space[],
    loading: false
  }),

  getters: {
    getById: (state) => {
      return (id: string) => state.spaces.find((s) => s.id === id)
    }
  },

  actions: {
    /** Get all spaces */
    async fetchSpaces(size = 10) {
      this.loading = true
      try {
        const api = useApi()
        const res = await api.get<GetSpacesRs>('/spaces', { query: { size } })
        this.spaces = res.spaces.content
      } finally {
        this.loading = false
      }
    },

    /** Create a new space */
    async createSpace(payload: CreateSpaceRq) {
      this.loading = true
      try {
        const api = useApi()
        const res = await api.post<CreateSpaceRs>('/spaces', payload)

        const space: Space = {
          id: res.id,
          name: res.name,
          createdAt: res.createdAt
        }

        this.spaces.unshift(space)
        return space
      } finally {
        this.loading = false
      }
    },

    /** Delete a space by ID */
    async deleteSpace(id: string) {
      this.loading = true
      try {
        const api = useApi()
        await api.del(`/spaces/${id}`)
        this.spaces = this.spaces.filter((s) => s.id !== id)
      } finally {
        this.loading = false
      }
    }
  }
})
