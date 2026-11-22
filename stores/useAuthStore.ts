import { defineStore } from 'pinia'
import { errorStatus, useApi } from '~/composables/useApi'
import { signOutLocally, useAuthToken } from '~/composables/useAuthToken'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserRs | null,
    registrationEnabled: true
  }),

  getters: {
    isSignedIn: (state) => state.user !== null
  },

  actions: {
    applySession(rs: AuthRs) {
      useAuthToken().value = rs.token
      this.user = rs.user
    },

    async login(email: string, password: string) {
      const api = useApi()
      this.applySession(
        await api.post<AuthRs>('/auth/login', { email, password }, undefined, { silent: true })
      )
    },

    async register(email: string, password: string) {
      const api = useApi()
      this.applySession(
        await api.post<AuthRs>('/auth/register', { email, password }, undefined, { silent: true })
      )
    },

    async fetchConfig() {
      const api = useApi()
      try {
        const rs = await api.get<AuthConfigRs>('/auth/config', undefined, { silent: true })
        this.registrationEnabled = rs.registrationEnabled
      } catch {
        // keep the default, the form reports a real error on submit
      }
    },

    /** Loads the user of the stored token; returns false when there is no valid session. */
    async restore() {
      const token = useAuthToken()
      if (!token.value) return false
      if (this.user) return true
      try {
        const api = useApi()
        this.user = await api.get<UserRs>('/auth/me', undefined, { silent: true })
        return true
      } catch (err) {
        // only a rejected token ends the session; an unreachable backend must not sign the user out
        if (errorStatus(err) !== 401) return true
        token.value = null
        this.user = null
        return false
      }
    },

    async logout() {
      try {
        const api = useApi()
        await api.post('/auth/logout', undefined, undefined, { silent: true })
      } catch {
        // the token is dropped locally anyway
      }
      this.user = null
      signOutLocally()
    },

    async changePassword(currentPassword: string, newPassword: string) {
      const api = useApi()
      await api.put('/account/password', { currentPassword, newPassword }, undefined, {
        silent: true
      })
    },

    /** Sends the key derived from the upload password; the password itself stays in the browser. */
    async setUploadKey(key: string) {
      const api = useApi()
      this.user = await api.put<UserRs>('/account/upload-key', { key }, undefined, { silent: true })
    }
  }
})
