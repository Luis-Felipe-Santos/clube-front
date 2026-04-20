<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

type Dependente = {
  id: number;
  nome: string;
  parentesco: string;
  imagemUrl?: string;
  imagemPreviewUrl?: string;
  status?: "ATIVO" | "INATIVO";
};

type DependentePayload = {
  nome: string;
  parentesco: string;
  imagemUrl: string | null;
  socioId: number;
};

type UploadResponse = {
  path: string;
  signedUrl?: string;
};

type SignedUrlResponse = {
  signedUrl: string;
};

const props = defineProps<{
  open: boolean;
  dependente?: Dependente | null;
  socioId: number;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  created: [dependente: Dependente];
  updated: [dependente: Dependente];
}>();

const toast = useToast();
const { post, put } = useCachedApi();

const loading = ref(false);
const selectedFile = ref<File | null>(null);
const imagePreview = ref("");

const accessToken = useCookie<string | null>("access_token");
const apiBase = useRuntimeConfig().public.apiBase;

const isEditing = computed(() => !!props.dependente?.id);

const schema = z.object({
  nome: z.string().min(3, "Informe o nome do dependente"),
  parentesco: z.string().min(2, "Informe o parentesco"),
});

type Schema = z.output<typeof schema>;

const state = reactive({
  nome: "",
  parentesco: "",
  imagemUrl: "",
});

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
});

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  selectedFile.value = file;
  imagePreview.value = URL.createObjectURL(file);
}

function resetForm() {
  state.nome = "";
  state.parentesco = "";
  state.imagemUrl = "";
  selectedFile.value = null;
  imagePreview.value = "";
}

async function getSignedImageUrl(path?: string | null) {
  if (!path) return "";

  try {
    const response = await $fetch<SignedUrlResponse>(
      "/dependentes/imagem/signed-url",
      {
        baseURL: apiBase,
        method: "GET",
        query: { path },
        headers: accessToken.value
          ? {
              Authorization: `Bearer ${accessToken.value}`,
            }
          : undefined,
      },
    );

    return response.signedUrl || "";
  } catch (error) {
    console.error("Erro ao gerar signed URL do dependente:", error);
    return "";
  }
}

async function fillForm() {
  state.nome = props.dependente?.nome || "";
  state.parentesco = props.dependente?.parentesco || "";
  state.imagemUrl = props.dependente?.imagemUrl || "";

  if (props.dependente?.imagemPreviewUrl) {
    imagePreview.value = props.dependente.imagemPreviewUrl;
  } else if (props.dependente?.imagemUrl) {
    imagePreview.value = await getSignedImageUrl(props.dependente.imagemUrl);
  } else {
    imagePreview.value = "";
  }
}

async function uploadImagem(): Promise<string | null> {
  if (!selectedFile.value) {
    return state.imagemUrl || null;
  }

  const formData = new FormData();
  formData.append("file", selectedFile.value);
  formData.append("socioId", String(props.socioId));

  const response = await $fetch<UploadResponse>("/dependentes/upload-imagem", {
    baseURL: apiBase,
    method: "POST",
    body: formData,
    headers: accessToken.value
      ? {
          Authorization: `Bearer ${accessToken.value}`,
        }
      : undefined,
  });

  if (response.signedUrl) {
    imagePreview.value = response.signedUrl;
  }

  return response.path;
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (loading.value) return;

  try {
    loading.value = true;

    const uploadedImagePath = await uploadImagem();

    const payload: DependentePayload = {
      nome: event.data.nome.trim(),
      parentesco: event.data.parentesco.trim(),
      imagemUrl: uploadedImagePath,
      socioId: props.socioId,
    };

    if (isEditing.value && props.dependente?.id) {
      const dependenteAtualizado = await put<Dependente, DependentePayload>(
        `/dependentes/${props.dependente.id}`,
        payload,
      );

      toast.add({
        title: "Dependente atualizado",
        description: "O dependente foi atualizado com sucesso.",
        color: "success",
      });

      resetForm();
      isOpen.value = false;
      emit("updated", dependenteAtualizado);
    } else {
      const dependenteCriado = await post<Dependente, DependentePayload>(
        "/dependentes",
        payload,
      );

      toast.add({
        title: "Dependente cadastrado",
        description: "O dependente foi cadastrado com sucesso.",
        color: "success",
      });

      resetForm();
      isOpen.value = false;
      emit("created", dependenteCriado);
    }
  } catch (error: any) {
    toast.add({
      title: isEditing.value ? "Erro ao atualizar" : "Erro ao cadastrar",
      description:
        error?.data?.message || "Não foi possível salvar o dependente.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  async (value) => {
    if (value) {
      await fillForm();
    } else {
      resetForm();
    }
  },
  { immediate: true },
);
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="isEditing ? 'Editar dependente' : 'Novo dependente'"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Nome" name="nome">
          <UInput
            v-model="state.nome"
            placeholder="Digite o nome do dependente"
          />
        </UFormField>

        <UFormField label="Parentesco" name="parentesco">
          <UInput
            v-model="state.parentesco"
            placeholder="Ex: Filho, Filha, Cônjuge"
          />
        </UFormField>

        <UFormField label="Foto do dependente">
          <input
            type="file"
            accept="image/*"
            @change="handleFileChange"
            class="block w-full text-sm cursor-pointer"
          />

          <div v-if="imagePreview" class="mt-3">
            <img
              :src="imagePreview"
              alt="Preview"
              class="h-24 w-24 rounded-full border object-cover"
            />
          </div>
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            color="neutral"
            variant="soft"
            label="Cancelar"
            @click="isOpen = false"
            class="cursor-pointer"
          />

          <UButton
            type="submit"
            :label="isEditing ? 'Atualizar' : 'Salvar'"
            icon="i-lucide-save"
            :loading="loading"
            :disabled="loading"
            class="cursor-pointer"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
