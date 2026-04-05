<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent, AuthFormField } from "@nuxt/ui";

const toast = useToast();
const auth = useAuthStore();

const error = ref(false);
const loading = ref(false);

const fields: AuthFormField[] = [
  {
    name: "name",
    type: "text",
    label: "Nome",
    placeholder: "Digite seu nome completo",
    required: true,
  },
  {
    name: "cpf",
    type: "text",
    label: "CPF",
    placeholder: "Digite seu CPF",
    required: true,
  },
  {
    name: "email",
    type: "email",
    label: "Email",
    placeholder: "Digite seu email",
    required: true,
  },
  {
    name: "password",
    type: "password",
    label: "Senha",
    placeholder: "Crie uma senha",
    required: true,
  },
  {
    name: "confirmPassword",
    type: "password",
    label: "Confirmar senha",
    placeholder: "Digite novamente sua senha",
    required: true,
  },
];

const schema = z
  .object({
    name: z.preprocess(
      (value) => value ?? "",
      z
        .string()
        .min(1, "Nome é obrigatório")
        .min(3, "O nome deve ter pelo menos 3 caracteres"),
    ),

    cpf: z.preprocess(
      (value) => value ?? "",
      z
        .string()
        .min(1, "CPF é obrigatório")
        .min(11, "CPF inválido")
        .max(14, "CPF inválido"),
    ),

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

    confirmPassword: z.preprocess(
      (value) => value ?? "",
      z
        .string()
        .min(1, "Confirmação de senha é obrigatória")
        .min(6, "A confirmação deve ter pelo menos 6 caracteres"),
    ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type Schema = z.infer<typeof schema>;

async function onSubmit(payload: FormSubmitEvent<any>) {
  error.value = false;
  loading.value = true;

  try {
    const { name, cpf, email, password } = payload.data as Schema;

    await auth.register(name, cpf, email, password);

    toast.add({
      title: "Conta criada com sucesso",
      description: "Agora você pode fazer login",
      color: "success",
    });

    await navigateTo("/auth/login");
  } catch {
    error.value = true;
    toast.add({
      title: "Erro ao criar conta",
      description: "Verifique os dados informados",
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
        title="Criar conta"
        icon="i-lucide-user-plus"
        @submit="onSubmit"
      >
        <template #description>
          Já possui uma conta?
          <ULink
            to="/auth/login"
            class="text-primary font-medium cursor-pointer"
          >
            Fazer login </ULink
          >.
        </template>

        <template #validation>
          <UAlert
            v-if="error"
            color="error"
            icon="i-lucide-info"
            title="Erro ao criar conta"
          />
        </template>

        <template #submit>
          <UButton
            type="submit"
            block
            :loading="loading"
            class="cursor-pointer"
          >
            Criar conta
          </UButton>
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
