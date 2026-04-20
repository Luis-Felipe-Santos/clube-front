<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent, FormErrorEvent } from "@nuxt/ui";
import { maskCnpj, onlyNumbers } from "~/utils/masks";

type Clube = {
  id: number;
  nome: string;
  cnpj?: string;
  status?: "ATIVO" | "INATIVO" | "BLOQUEADO";
};

const props = defineProps<{
  open: boolean;
  clube?: Clube | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  success: [];
}>();

const toast = useToast();
const loading = ref(false);
const { post, put, patch } = useCachedApi();

const isEditing = computed(() => !!props.clube?.id);

const createSchema = z.object({
  nome: z.string().min(3, "Informe o nome do clube"),
  cnpj: z
    .string()
    .min(14, "Informe um CNPJ válido")
    .refine((value) => onlyNumbers(value).length === 14, {
      message: "Informe um CNPJ válido",
    }),
});

const editSchema = z.object({
  nome: z.string().min(3, "Informe o nome do clube"),
  status: z.enum(["ATIVO", "INATIVO", "BLOQUEADO"]),
});

const formSchema = computed(() =>
  isEditing.value ? editSchema : createSchema,
);

const state = reactive({
  nome: "",
  cnpj: "",
  status: "ATIVO" as "ATIVO" | "INATIVO" | "BLOQUEADO",
});

const statusOptions = [
  { label: "Ativo", value: "ATIVO" },
  { label: "Inativo", value: "INATIVO" },
  { label: "Bloqueado", value: "BLOQUEADO" },
];

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
});

function resetForm() {
  state.nome = "";
  state.cnpj = "";
  state.status = "ATIVO";
}

function fillForm() {
  state.nome = props.clube?.nome || "";
  state.cnpj = props.clube?.cnpj ? maskCnpj(props.clube.cnpj) : "";
  state.status = props.clube?.status || "ATIVO";
}

function onError(event: FormErrorEvent) {
  console.log("Erros do formulário:", event.errors);
}

async function updateStatusIfNeeded(
  id: number,
  oldStatus?: string,
  newStatus?: string,
) {
  if (!newStatus || oldStatus === newStatus) return;

  if (newStatus === "ATIVO") {
    await patch(`/clubes/${id}/reativar`);
    return;
  }

  if (newStatus === "INATIVO") {
    await patch(`/clubes/${id}/inativar`);
    return;
  }

  if (newStatus === "BLOQUEADO") {
    await patch(`/clubes/${id}/bloquear`);
  }
}

async function onSubmit(event: FormSubmitEvent<any>) {
  try {
    loading.value = true;

    if (isEditing.value && props.clube?.id) {
      const payload = {
        nome: event.data.nome.trim(),
      };

      await put(`/clubes/${props.clube.id}`, payload);

      await updateStatusIfNeeded(
        props.clube.id,
        props.clube.status,
        state.status,
      );

      toast.add({
        title: "Clube atualizado",
        description: "O clube foi atualizado com sucesso.",
        color: "success",
      });
    } else {
      const payload = {
        nome: event.data.nome.trim(),
        cnpj: onlyNumbers(event.data.cnpj),
      };

      await post("/clubes", payload);

      toast.add({
        title: "Clube cadastrado",
        description: "O clube foi cadastrado com sucesso.",
        color: "success",
      });
    }

    resetForm();
    isOpen.value = false;
    emit("success");
  } catch (error: any) {
    console.error("Erro ao salvar clube:", error);
    console.error("Resposta da API:", error?.data);

    toast.add({
      title: isEditing.value ? "Erro ao atualizar" : "Erro ao cadastrar",
      description: error?.data?.message || "Não foi possível salvar o clube.",
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
  () => props.clube,
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
    :title="isEditing ? 'Editar clube' : 'Novo clube'"
  >
    <template #body>
      <UForm
        :schema="formSchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
        @error="onError"
      >
        <UFormField label="Nome do clube" name="nome">
          <UInput v-model="state.nome" placeholder="Digite o nome do clube" />
        </UFormField>

        <UFormField v-if="!isEditing" label="CNPJ" name="cnpj">
          <UInput
            :model-value="state.cnpj"
            placeholder="00.000.000/0000-00"
            @update:model-value="state.cnpj = maskCnpj($event)"
          />
        </UFormField>

        <UFormField v-else label="CNPJ">
          <UInput :model-value="state.cnpj" disabled />
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
            :label="isEditing ? 'Atualizar' : 'Salvar'"
            icon="i-lucide-save"
            class="cursor-pointer"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
