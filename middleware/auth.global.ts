/**
 * Every page needs a signed-in user except the ones marked `definePageMeta({ public: true })`
 * (sign-in and sign-up), which in turn send signed-in users home.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  const isPublic = to.meta.public === true
  const signedIn = await auth.restore()

  if (!signedIn && !isPublic) {
    const redirect = to.fullPath !== '/' ? to.fullPath : undefined
    return navigateTo({ path: '/login', query: redirect ? { redirect } : undefined })
  }
  if (signedIn && isPublic) {
    return navigateTo('/')
  }
})
