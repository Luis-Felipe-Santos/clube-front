<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent, FormErrorEvent } from "@nuxt/ui";

type Plano = {
  id: number;
  nome: string;
  valor: number;
  periodicidade?: "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
  status?: "ATIVO" | "INATIVO";
  clubeId?: number;
};
type ClubeOption = {
  id: number;
  nome: string;
};

const props = defineProps<{
  open: boolean;
  plano?: Plano | null;
  clubes: ClubeOption[];
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  success: [];
}>();

const toast = useToast();
const loading = ref(false);
const { post, put } = useApi();

const isEditing = computed(() => !!props.plano?.id);

const createSchema = z.object({
  nome: z.string().min(3, "Informe o nome do plano"),
  valor: z.coerce.number().positive("Informe um valor válido"),
  periodicidade: z.enum(["MENSAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"]),
  clubeId: z
    .union([z.string(), z.number()])
    .transform((value) => Number(value))
    .refine((value) => !Number.isNaN(value) && value > 0, {
      message: "Selecione um clube",
    }),
});

const editSchema = z.object({
  nome: z.string().min(3, "Informe o nome do plano"),
  valor: z.coerce.number().positive("Informe um valor válido"),
  periodicidade: z.enum(["MENSAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"]),
  status: z.enum(["ATIVO", "INATIVO"]),
  clubeId: z
    .union([z.string(), z.number()])
    .transform((value) => Number(value))
    .refine((value) => !Number.isNaN(value) && value > 0, {
      message: "Selecione um clube",
    }),
});

const formSchema = computed(() =>
  isEditing.value ? editSchema : createSchema,
);

type CreateSchema = z.output<typeof createSchema>;
type EditSchema = z.output<typeof editSchema>;

const state = reactive({
  nome: "",
  valor: "",
  periodicidade: "MENSAL" as "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL",
  status: "ATIVO" as "ATIVO" | "INATIVO",
  clubeId: undefined as number | undefined,
});

const periodicidadeOptions = [
  { label: "Mensal", value: "MENSAL" },
  { label: "Trimestral", value: "TRIMESTRAL" },
  { label: "Semestral", value: "SEMESTRAL" },
  { label: "Anual", value: "ANUAL" },
];

const statusOptions = [
  { label: "Ativo", value: "ATIVO" },
  { label: "Inativo", value: "INATIVO" },
];

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
});

const clubeOptions = computed(() =>
  props.clubes.map((clube) => ({
    label: clube.nome,
    value: clube.id,
  })),
);

function resetForm() {
  state.nome = "";
  state.valor = "";
  state.periodicidade = "MENSAL";
  state.status = "ATIVO";
  state.clubeId = undefined;
}

function fillForm() {
  state.nome = props.plano?.nome || "";
  state.valor = props.plano?.valor != null ? String(props.plano.valor) : "";
  state.periodicidade = props.plano?.periodicidade || "MENSAL";
  state.status = props.plano?.status || "ATIVO";
  state.clubeId = props.plano?.clubeId;
}

function onError(event: FormErrorEvent) {
  console.log("Erros do formulário:", event.errors);
}

async function onSubmit(event: FormSubmitEvent<CreateSchema | EditSchema>) {
  try {
    loading.value = true;

    const payload = {
      nome: event.data.nome.trim(),
      valor: Number(event.data.valor),
      periodicidade: state.periodicidade,
      ...(isEditing.value ? { status: state.status } : {}),
      clubeId: Number(state.clubeId),
    };

    if (isEditing.value && props.plano?.id) {
      await put(`/planos/${props.plano.id}`, payload);

      toast.add({
        title: "Plano atualizado",
        description: "O plano foi atualizado com sucesso.",
        color: "success",
      });
    } else {
      await post("/planos", payload);

      toast.add({
        title: "Plano cadastrado",
        description: "O plano foi cadastrado com sucesso.",
        color: "success",
      });
    }

    resetForm();
    isOpen.value = false;
    emit("success");
  } catch (error: any) {
    console.error("Erro ao salvar plano:", error);
    console.error("Resposta da API:", error?.data);

    toast.add({
      title: isEditing.value ? "Erro ao atualizar" : "Erro ao cadastrar",
      description: error?.data?.message || "Não foi possível salvar o plano.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  (value) => {
    if (value) {
      fillForm();
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

watch(
  () => props.plano,
  () => {
    if (props.open) {
      fillForm();
    }
  },
  { immediate: true, deep: true },
);
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="isEditing ? 'Editar plano' : 'Novo plano'"
  >
    <template #body>
      <UForm
        :schema="formSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
        @error="onError"
      >
        <UFormField label="Nome do plano" name="nome">
          <UInput v-model="state.nome" placeholder="Digite o nome do plano" />
        </UFormField>

        <UFormField label="Valor" name="valor">
          <UInput
            v-model="state.valor"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
          />
        </UFormField>

        <UFormField label="Periodicidade" name="periodicidade">
          <USelect
            v-model="state.periodicidade"
            :items="periodicidadeOptions"
            value-key="value"
            option-attribute="label"
            placeholder="Selecione a periodicidade"
          />
        </UFormField>

        <UFormField v-if="isEditing" label="Status" name="status">
          <USelect
            v-model="state.status"
            :items="statusOptions"
            value-key="value"
            option-attribute="label"
            placeholder="Selecione o status"
          />
        </UFormField>
        <UFormField label="Clube" name="clubeId">
          <USelect
            v-model="state.clubeId"
            :items="clubeOptions"
            value-key="value"
            option-attribute="label"
            placeholder="Selecione o clube"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            color="neutral"
            variant="soft"
            label="Cancelar"
            @click="isOpen = false"
          />

          <UButton
            type="submit"
            :label="isEditing ? 'Atualizar' : 'Salvar'"
            icon="i-lucide-save"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
