<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent, AuthFormField } from "@nuxt/ui";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const auth = useAuthStore();

const loading = ref(false);
const error = ref(false);

const token = computed(() => {
  const value = route.query.token;
  return typeof value === "string" ? value : "";
});

const fields: AuthFormField[] = [
  {
    name: "newPassword",
    type: "password",
    label: "Nova senha",
    placeholder: "Digite sua nova senha",
    required: true,
  },
  {
    name: "confirmPassword",
    type: "password",
    label: "Confirmar senha",
    placeholder: "Digite novamente sua nova senha",
    required: true,
  },
];

const schema = z
  .object({
    newPassword: z.preprocess(
      (value) => value ?? "",
      z
        .string()
        .min(1, "Nova senha é obrigatória")
        .min(6, "A senha deve ter pelo menos 6 caracteres"),
    ),
    confirmPassword: z.preprocess(
      (value) => value ?? "",
      z
        .string()
        .min(1, "Confirmação de senha é obrigatória")
        .min(6, "A confirmação deve ter pelo menos 6 caracteres"),
    ),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type Schema = z.infer<typeof schema>;

async function onSubmit(payload: FormSubmitEvent<any>) {
  loading.value = true;
  error.value = false;

  try {
    if (!token.value) {
      throw new Error("Token não encontrado");
    }

    const { newPassword, confirmPassword } = payload.data as Schema;

    await auth.resetPassword(token.value, newPassword, confirmPassword);

    toast.add({
      title: "Senha redefinida com sucesso",
      description: "Agora você já pode fazer login com a nova senha.",
      color: "success",
    });

    await router.push("/auth/login");
  } catch {
    error.value = true;

    toast.add({
      title: "Erro ao redefinir senha",
      description: "Verifique se o link ainda é válido.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 p-4">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="schema"
        :fields="fields"
        title="Redefinir senha"
        icon="i-lucide-lock"
        @submit="onSubmit"
      >
        <template #description>
          Digite sua nova senha para concluir a recuperação.
        </template>

        <template #validation>
          <UAlert
            v-if="!token"
            color="error"
            icon="i-lucide-alert-circle"
            title="Link inválido"
            description="O token de recuperação não foi encontrado na URL."
          />

          <UAlert
            v-else-if="error"
            color="error"
            icon="i-lucide-info"
            title="Não foi possível redefinir a senha"
          />
        </template>

        <template #submit>
          <UButton
            type="submit"
            block
            :loading="loading"
            :disabled="!token"
            class="cursor-pointer"
          >
            Salvar nova senha
          </UButton>
        </template>
      </UAuthForm>

      <div class="mt-4 text-center">
        <ULink to="/auth/login" class="text-primary font-medium">
          Voltar para o login
        </ULink>
      </div>
    </UPageCard>
  </div>
</template>
