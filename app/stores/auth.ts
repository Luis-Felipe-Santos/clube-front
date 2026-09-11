import { defineStore } from "pinia";
import { useApi } from "~/composables/useApi";

type UserProfile = {
  id?: number
  nome?: string
  email?: string
  cpf?: string
  telefone?: string
  imagemUrl?: string | null
  role?: string
  roles?: string[]
  clubeId?: number | null
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = useCookie<string | null>('access_token')
  const refreshToken = useCookie<string | null>('refresh_token')
  const user = ref<UserProfile | null>(null)
  const loading = ref(false)

  const { get, post, patch, put } = useApi()
  const { invalidateAll } = useCachedApi()

  const fetchUser = async () => {
    if (!accessToken.value) return;

    try {
      loading.value = true;
      user.value = await get("/usuarios/me");
    } catch (error: any) {
      const status =
        error?.response?.status || error?.status || error?.data?.status;

      if (status === 401) {
        user.value = null;
        accessToken.value = null;
        refreshToken.value = null;
      } else {
        throw error;
      }
    } finally {
      loading.value = false;
    }
  };

  const login = async (email: string, senha: string) => {
    invalidateAll();

    const response: any = await $fetch("/auth/login", {
      baseURL: useRuntimeConfig().public.apiBase,
      method: "POST",
      body: { email, senha },
    });

    accessToken.value = response.token;

    user.value = await $fetch("/usuarios/me", {
      baseURL: useRuntimeConfig().public.apiBase,
      headers: {
        Authorization: `Bearer ${response.token}`,
      },
    });
  };

  const logout = () => {
    invalidateAll();
    accessToken.value = null;
    refreshToken.value = null;
    user.value = null;
    navigateTo("/auth/login");
  };

  const register = async (
    nome: string,
    cpf: string,
    email: string,
    senha: string,
  ) => {
    await post("/cadastro", {
      nome,
      cpf,
      email,
      senha,
    });
  };

  const updateProfile = async (
    payload: Partial<UserProfile> & { senha?: string },
  ) => {
    const userId = user.value?.id;

    if (!userId) {
      throw new Error("Usuário não identificado para atualização.");
    }

    const response = await put<UserProfile, Partial<UserProfile> & { senha?: string }>(`/usuarios/${userId}`, payload);

    user.value = {
      ...(user.value ?? {}),
      ...response,
    };

    return user.value;
  };

  const forgotPassword = async (email: string) => {
    await $fetch("/auth/forgot-password", {
      baseURL: useRuntimeConfig().public.apiBase,
      method: "POST",
      body: { email },
    });
  };

  const resetPassword = async (
    token: string,
    newPassword: string,
    confirmPassword: string,
  ) => {
    await $fetch("/auth/reset-password", {
      baseURL: useRuntimeConfig().public.apiBase,
      method: "POST",
      body: {
        token,
        newPassword,
        confirmPassword,
      },
    });
  };

  return {
    user,
    accessToken,
    refreshToken,
    loading,
    login,
    logout,
    fetchUser,
    register,
    updateProfile,
    forgotPassword,
    resetPassword,
  };
});
