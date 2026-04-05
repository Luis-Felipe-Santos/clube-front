<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent, AuthFormField } from "@nuxt/ui";

const toast = useToast();
const auth = useAuthStore();

const loading = ref(false);
const success = ref(false);
const error = ref(false);

const fields: AuthFormField[] = [
  {
    name: "email",
    type: "email",
    label: "Email",
    placeholder: "Digite seu email",
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
});

type Schema = z.infer<typeof schema>;

async function onSubmit(payload: FormSubmitEvent<any>) {
  loading.value = true;
  success.value = false;
  error.value = false;

  try {
    const { email } = payload.data as Schema;

    await auth.forgotPassword(email);

    success.value = true;

    toast.add({
      title: "Solicitação enviada",
      description:
        "Se o email estiver cadastrado, você receberá as instruções.",
      color: "success",
    });
  } catch {
    error.value = true;

    toast.add({
      title: "Erro ao solicitar recuperação",
      description: "Tente novamente em instantes.",
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
        title="Recuperar senha"
        icon="i-lucide-mail"
        @submit="onSubmit"
      >
        <template #description>
          Informe seu email para receber o link de redefinição.
        </template>

        <template #validation>
          <UAlert
            v-if="success"
            color="success"
            icon="i-lucide-check-circle"
            title="Solicitação enviada"
            description="Se o email estiver cadastrado, você receberá as instruções."
          />

          <UAlert
            v-else-if="error"
            color="error"
            icon="i-lucide-info"
            title="Erro ao processar solicitação"
          />
        </template>

        <template #submit>
          <UButton
            type="submit"
            block
            :loading="loading"
            class="cursor-pointer"
          >
            Enviar link de recuperação
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
