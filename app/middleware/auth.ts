import { useAuthStore } from "~/stores/auth"

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  const publicRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/forgotPassword",
    "/auth/resetPassword",
  ]

  if (publicRoutes.includes(to.path)) return

  if (!auth.accessToken) {
    return navigateTo("/auth/login")
  }

  if (!auth.user) {
    try {
      await auth.fetchUser()
    } catch (error) {
      return navigateTo("/auth/login")
    }
  }

  if (!auth.user) {
    return navigateTo("/auth/login")
  }
})