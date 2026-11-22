declare module '#app' {
  interface PageMeta {
    /** Reachable without signing in (sign-in and sign-up pages) */
    public?: boolean
  }
}

export {}
