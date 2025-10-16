import type { NitroFetchRequest, NitroFetchOptions } from 'nitropack'
import { NotificationType } from '~/types/notification'
import useNotification from '~/composables/useNotification'

export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase
  const { notify } = useNotification()

  async function request<T>(
    endpoint: NitroFetchRequest,
    options: NitroFetchOptions<NitroFetchRequest> = {}
  ): Promise<T> {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    try {
      return await $fetch<T>(endpoint, {
        baseURL,
        headers: {
          Authorization: `Bearer ${config.public.apiToken}`
        },
        ...options
      })
    } catch (err: any) {
      const message =
        err?.response?._data?.message ||
        err?.statusMessage ||
        err?.message ||
        'Something went wrong'

      notify({
        type: NotificationType.ERROR,
        message
      })

      throw err
    }

    /* eslint-enable @typescript-eslint/no-explicit-any */
  }

  const get = <T>(
    url: NitroFetchRequest,
    opts?: NitroFetchOptions<NitroFetchRequest>
  ): Promise<T> => request<T>(url, { method: 'GET', ...opts })

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const post = <TResponse>(
    url: NitroFetchRequest,
    body?: any,
    opts?: NitroFetchOptions<NitroFetchRequest>
  ): Promise<TResponse> => request<TResponse>(url, { method: 'POST', body, ...opts })
  /* eslint-enable @typescript-eslint/no-explicit-any */

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const patch = <TResponse>(
    url: NitroFetchRequest,
    body?: any,
    opts?: NitroFetchOptions<NitroFetchRequest>
  ): Promise<TResponse> => request<TResponse>(url, { method: 'PATCH', body, ...opts })
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const del = <T>(
    url: NitroFetchRequest,
    opts?: NitroFetchOptions<NitroFetchRequest>
  ): Promise<T> => request<T>(url, { method: 'DELETE', ...opts })

  return { get, post, patch, del }
}
