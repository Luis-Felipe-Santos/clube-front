<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent, AuthFormField } from "@nuxt/ui";

const toast = useToast();
const auth = useAuthStore();

const error = ref(false);
const loading = ref(false);

const fields: AuthFormField[] = [
  {
    name: "email",
    type: "email",
    label: "Email",
    placeholder: "Digite o seu email",
    required: true,
  },
  {
    name: "password",
    label: "Senha",
    type: "password",
    placeholder: "Digite sua senha",
    required: true,
  },
];

const schema = z.object({
  email: z.preprocess(
    (value) => value ?? "",
    z
      .string()
      .min(1, "Email é obrigatório")
      .email({ message: "Digite um email válido" }),
  ),

  password: z.preprocess(
    (value) => value ?? "",
    z
      .string()
      .min(1, "Senha é obrigatória")
      .min(6, "A senha deve ter pelo menos 6 caracteres"),
  ),
});

type Schema = z.infer<typeof schema>;

async function onSubmit(payload: FormSubmitEvent<any>) {
  error.value = false;
  loading.value = true;

  try {
    const { email, password } = payload.data as Schema;

    await auth.login(email, password);
    await navigateTo("/app");
  } catch {
    error.value = true;
    toast.add({
      title: "Erro ao fazer login",
      description: "Verifique suas credenciais",
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
        title="Login"
        icon="i-lucide-user"
        @submit="onSubmit"
      >
        <template #description>
          Você ainda não tem uma conta?
          <ULink
            to="/auth/register"
            class="text-primary font-medium cursor-pointer"
          >
            Cadastre-se </ULink
          >.
        </template>

        <template #password-hint>
          <ULink
            to="/auth/forgotPassword"
            class="text-primary font-medium"
            tabindex="-1"
          >
            Esqueceu sua senha?
          </ULink>
        </template>

        <template #validation>
          <UAlert
            v-if="error"
            color="error"
            icon="i-lucide-info"
            title="Email ou senha incorretos"
          />
        </template>

        <template #submit>
          <UButton
            type="submit"
            block
            :loading="loading"
            class="cursor-pointer"
          >
            Entrar
          </UButton>
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
