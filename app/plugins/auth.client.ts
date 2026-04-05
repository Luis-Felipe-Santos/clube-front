import { useAuthStore } from "~/stores/auth"

export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()

  if (auth.token) {
    await auth.fetchUser()
  }
})