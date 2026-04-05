export const useApi = () => {
  const { $api } = useNuxtApp()

  const get = async <T>(url: string): Promise<T> => {
    return await $api<T>(url, { method: 'GET' })
  }

  const post = async <T, B extends Record<string, unknown>>(
    url: string,
    data: B
  ): Promise<T> => {
    return await $api<T>(url, {
      method: 'POST',
      body: data
    })
  }
  const put = async <T, B extends Record<string, unknown>>(
    url: string,
    data: B
  ): Promise<T> => {
    return await $api<T>(url, {
      method: "PUT",
      body: data,
    });
  };
  const patch = async <
    T,
    B extends Record<string, unknown> | undefined = undefined
  >(
    url: string,
    data?: B
  ): Promise<T> => {
    return await $api<T>(url, {
      method: "PATCH",
      body: data,
    });
  };

  const del = async <T>(url: string): Promise<T> => {
    return await $api<T>(url, { method: 'DELETE' })
  }

  return { get, post, put, patch, del }
}