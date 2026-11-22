import type { NitroFetchRequest, NitroFetchOptions } from 'nitropack'
import { NotificationType } from '~/types/notification'
import useNotification from '~/composables/useNotification'
import { signOutLocally, useAuthToken } from '~/composables/useAuthToken'

export interface ApiOptions {
  /** Do not show a toast on errors, the caller handles them */
  silent?: boolean
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function errorMessage(err: any, fallback = 'Something went wrong'): string {
  return (
    err?.response?._data?.detail ||
    err?.response?._data?.message ||
    err?.data?.detail ||
    err?.statusMessage ||
    err?.message ||
    fallback
  )
}

export function errorStatus(err: any): number | undefined {
  return err?.response?.status ?? err?.status ?? err?.statusCode
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register']

export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = import.meta.server
    ? (config.apiBase as string)
    : (config.public.apiBase as string)
  const { notify } = useNotification()
  const token = useAuthToken()

  async function request<T>(
    endpoint: NitroFetchRequest,
    options: NitroFetchOptions<NitroFetchRequest> = {},
    apiOptions: ApiOptions = {}
  ): Promise<T> {
    const headers = new Headers(options.headers as HeadersInit | undefined)
    if (token.value && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token.value}`)
    }
    try {
      return await $fetch<T>(endpoint, {
        baseURL,
        ...options,
        headers
      })
    } catch (err) {
      const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => String(endpoint).startsWith(path))
      if (errorStatus(err) === 401 && !isAuthEndpoint) {
        // the session expired or was revoked (e.g. password changed on another device)
        if (import.meta.client) signOutLocally(window.location.pathname + window.location.search)
        else token.value = null
        throw err
      }
      if (!apiOptions.silent) {
        notify({ type: NotificationType.ERROR, message: errorMessage(err) })
      }
      throw err
    }
  }

  const get = <T>(
    url: NitroFetchRequest,
    opts?: NitroFetchOptions<NitroFetchRequest>,
    apiOptions?: ApiOptions
  ): Promise<T> => request<T>(url, { method: 'GET', ...opts }, apiOptions)

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const post = <TResponse>(
    url: NitroFetchRequest,
    body?: any,
    opts?: NitroFetchOptions<NitroFetchRequest>,
    apiOptions?: ApiOptions
  ): Promise<TResponse> => request<TResponse>(url, { method: 'POST', body, ...opts }, apiOptions)

  const patch = <TResponse>(
    url: NitroFetchRequest,
    body?: any,
    opts?: NitroFetchOptions<NitroFetchRequest>,
    apiOptions?: ApiOptions
  ): Promise<TResponse> => request<TResponse>(url, { method: 'PATCH', body, ...opts }, apiOptions)

  const put = <TResponse>(
    url: NitroFetchRequest,
    body?: any,
    opts?: NitroFetchOptions<NitroFetchRequest>,
    apiOptions?: ApiOptions
  ): Promise<TResponse> => request<TResponse>(url, { method: 'PUT', body, ...opts }, apiOptions)
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const del = <T>(
    url: NitroFetchRequest,
    opts?: NitroFetchOptions<NitroFetchRequest>,
    apiOptions?: ApiOptions
  ): Promise<T> => request<T>(url, { method: 'DELETE', ...opts }, apiOptions)

  return { get, post, patch, put, del }
}
