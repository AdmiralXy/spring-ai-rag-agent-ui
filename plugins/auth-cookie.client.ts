import { touchAuthToken } from '~/composables/useAuthToken'

/** Restarts the sign-in cookie lifetime on every app load. */
export default defineNuxtPlugin(() => {
  touchAuthToken()
})
