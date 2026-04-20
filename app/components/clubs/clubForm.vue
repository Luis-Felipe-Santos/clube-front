<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent, FormErrorEvent } from "@nuxt/ui";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  success: [];
}>();

const toast = useToast();
const loading = ref(false);
const { post } = useCachedApi();

const schema = z.object({
  nome: z.string().min(3, "Informe o nome do clube"),
  cnpj: z.string().min(14, "Informe um CNPJ válido"),
  cidade: z.string().min(2, "Informe a cidade"),
});

type Schema = z.output<typeof schema>;

const state = reactive({
  nome: "",
  cnpj: "",
  cidade: "",
});

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
});

function resetForm() {
  state.nome = "";
  state.cnpj = "";
  state.cidade = "";
}

function onError(event: FormErrorEvent) {
  console.log("Erros do formulário:", event.errors);
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    loading.value = true;

    console.log("Dados enviados:", event.data);

    await post("/clubes", event.data);

    toast.add({
      title: "Clube cadastrado",
      description: "O clube foi cadastrado com sucesso.",
      color: "success",
    });

    resetForm();
    isOpen.value = false;
    emit("success");
  } catch (error) {
    console.error("Erro ao cadastrar clube:", error);

    toast.add({
      title: "Erro ao cadastrar",
      description: "Não foi possível cadastrar o clube.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  (value) => {
    if (!value) {
      resetForm();
    }
  },
);
</script>

<template>
  <UModal v-model:open="isOpen" title="Novo clube">
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
        @error="onError"
      >
        <UFormField label="Nome do clube" name="nome">
          <UInput v-model="state.nome" placeholder="Digite o nome do clube" />
        </UFormField>

        <UFormField label="CNPJ" name="cnpj">
          <UInput v-model="state.cnpj" placeholder="00.000.000/0000-00" />
        </UFormField>

        <UFormField label="Cidade" name="cidade">
          <UInput v-model="state.cidade" placeholder="Digite a cidade" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            color="neutral"
            variant="soft"
            label="Cancelar"
            class="cursor-pointer"
            @click="isOpen = false"
          />

          <UButton
            type="submit"
            label="Salvar"
            icon="i-lucide-save"
            class="cursor-pointer"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
