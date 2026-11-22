const TOKEN_COOKIE = 'agent-token'
// the browser maximum (400 days); the backend decides when a session really ends
const TOKEN_MAX_AGE = 60 * 60 * 24 * 400

/**
 * Bearer token of the signed-in user. Kept in a cookie so server-side rendering can call the API too;
 * the API itself only reads the `Authorization` header, never the cookie.
 */
export function useAuthToken() {
  return useCookie<string | null>(TOKEN_COOKIE, {
    default: () => null,
    maxAge: TOKEN_MAX_AGE,
    sameSite: 'lax',
    // plain-HTTP deployments would never get a secure cookie back
    secure: import.meta.client ? window.location.protocol === 'https:' : false,
    path: '/'
  })
}

/**
 * Writes the cookie again so its lifetime restarts. The backend extends the token on every request,
 * so with this an active user never has to sign in again.
 */
export function touchAuthToken() {
  if (!import.meta.client) return
  const token = useAuthToken().value
  if (!token) return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; Max-Age=${TOKEN_MAX_AGE}; Path=/; SameSite=Lax${secure}`
}

/** Headers for requests made with plain `fetch` (streams, downloads). */
export function authHeaders(): Record<string, string> {
  const token = useAuthToken().value
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Drops the session and reloads into the sign-in page, which also resets every store. */
export function signOutLocally(redirect?: string) {
  try {
    useAuthToken().value = null
  } catch {
    // outside of a Nuxt context: the cookie is dropped directly below
  }
  if (import.meta.client) {
    document.cookie = `${TOKEN_COOKIE}=; Max-Age=0; path=/`
    const query = redirect && redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''
    window.location.href = `/login${query}`
  }
}
