export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const accessToken = useCookie<string | null>('access_token')
  const refreshToken = useCookie<string | null>('refresh_token')

  let api: ReturnType<typeof $fetch.create>

  api = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: 'include',

    onRequest({ options }) {
      if (accessToken.value) {
        const headers = new Headers(options.headers || {})
        headers.set('Authorization', `Bearer ${accessToken.value}`)
        options.headers = headers
      }
    },

    async onResponseError({ response, request, options }) {
      const opts = options as typeof options & { _retry?: boolean }

      if (response.status === 401 && refreshToken.value && !opts._retry) {
        opts._retry = true

        try {
          const data = await $fetch<{ token: string }>('/auth/refresh', {
            baseURL: config.public.apiBase,
            method: 'POST',
            credentials: 'include',
            body: {
              refreshToken: refreshToken.value
            }
          })

          accessToken.value = data.token

          const headers = new Headers(opts.headers || {})
          headers.set('Authorization', `Bearer ${data.token}`)

          return await api(String(request), {
            headers,
            method: opts.method as
              | 'GET'
              | 'POST'
              | 'PUT'
              | 'DELETE'
              | 'PATCH'
              | 'get'
              | 'post'
              | 'put'
              | 'delete'
              | 'patch'
              | undefined,
            body: opts.body,
            query: opts.query,
            params: opts.params
          })
        } catch {
          accessToken.value = null
          refreshToken.value = null
          await navigateTo('/auth/login')
          return
        }
      }

      if (response.status === 401) {
        accessToken.value = null
        refreshToken.value = null
        await navigateTo('/auth/login')
        return
      }

      if (response.status === 403) {
        return
      }

      return
    }
  })

  return {
    provide: {
      api
    }
  }
})