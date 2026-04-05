import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = useCookie<string | null>('access_token')
  const refreshToken = useCookie<string | null>('refresh_token')
  const user = ref<any>(null)
  const loading = ref(false)

  const { get, post } = useApi()

  const fetchUser = async () => {
    if (!accessToken.value) return

    try {
      loading.value = true
      user.value = await get('/usuarios/me')
    } catch (error: any) {
      const status = error?.response?.status || error?.status || error?.data?.status

      if (status === 401 || status === 403) {
        user.value = null
        accessToken.value = null
        refreshToken.value = null
      } else {
        throw error
      }
    } finally {
      loading.value = false
    }
  }

  const login = async (email: string, senha: string) => {
    const response: any = await $fetch('/auth/login', {
      baseURL: useRuntimeConfig().public.apiBase,
      method: 'POST',
      body: { email, senha }
    })
 
    accessToken.value = response.token

    user.value = await $fetch('/usuarios/me', {
      baseURL: useRuntimeConfig().public.apiBase,
      headers: {
        Authorization: `Bearer ${response.token}`
      }
    })
  }

  const logout = () => {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    navigateTo('/auth/login')
  }

  const register = async (nome: string, cpf: string, email: string, senha: string) => {
  await post('/cadastro', {
    nome,
    cpf,
    email,
    senha
  })
}

  const forgotPassword = async (email: string) => {
    await $fetch('/auth/forgot-password', {
      baseURL: useRuntimeConfig().public.apiBase,
      method: 'POST',
      body: { email }
    })
  }

  const resetPassword = async (
    token: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    await $fetch('/auth/reset-password', {
      baseURL: useRuntimeConfig().public.apiBase,
      method: 'POST',
      body: {
        token,
        newPassword,
        confirmPassword
      }
    })
  }

  return {
    user,
    accessToken,
    refreshToken,
    loading,
    login,
    logout,
    fetchUser,
    register,
    forgotPassword,
    resetPassword
  }
})