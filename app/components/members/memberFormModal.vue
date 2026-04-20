<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import { maskDocument, maskPhone, onlyNumbers } from "~/utils/masks";
import { isValidPhone, isValidDocument } from "~/utils/validators";

type Socio = {
  id: number;
  nome: string;
  tipoDocumento?: "CPF" | "CNPJ";
  documento?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  imagemUrl?: string;
  imagemPreviewUrl?: string;
  socioPlanoId?: number;
  planoId?: number;
  planoNome?: string;
  statusPlano?: "ATIVO" | "SUSPENSO" | "CANCELADO";
};

type PlanoOption = {
  id: number;
  nome: string;
};

type SocioPayload = {
  nome: string;
  tipoDocumento: "CPF" | "CNPJ" | null;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  imagemUrl: string | null;
  clubeId: number;
};

type SocioPlanoCreatePayload = {
  socioId: number;
  planoId: number;
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
  socio?: Socio | null;
  clubeId: number;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  created: [socio: Socio];
  updated: [socio: Socio];
}>();

const toast = useToast();
const { get, post, patch, put } = useCachedApi();
const loading = ref(false);

const selectedFile = ref<File | null>(null);
const imagePreview = ref<string>("");
const plans = ref<PlanoOption[]>([]);

const accessToken = useCookie<string | null>("access_token");
const apiBase = useRuntimeConfig().public.apiBase;

const isEditing = computed(() => !!props.socio?.id);

const schema = z
  .object({
    nome: z.string().min(3, "Informe o nome do sócio"),
    tipoDocumento: z.enum(["CPF", "CNPJ"]).optional(),
    documento: z.string().optional(),
    telefone: z.string().optional(),
    email: z.string().email("Email inválido").or(z.literal("")).optional(),
    endereco: z.string().optional(),
    imagemUrl: z.string().optional(),
    planoId: z.number().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasTipoDocumento = !!data.tipoDocumento;
    const hasDocumento = !!data.documento?.trim();
    const hasTelefone = !!data.telefone?.trim();

    if (hasTipoDocumento && !hasDocumento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["documento"],
        message: "Informe o documento",
      });
    }

    if (!hasTipoDocumento && hasDocumento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipoDocumento"],
        message: "Selecione o tipo de documento",
      });
    }

    if (hasDocumento && data.tipoDocumento) {
      const valid = isValidDocument(data.documento || "", data.tipoDocumento);

      if (!valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["documento"],
          message: "Documento inválido",
        });
      }
    }

    if (hasTelefone && !isValidPhone(data.telefone || "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["telefone"],
        message: "Informe um telefone válido",
      });
    }
  });

type Schema = z.output<typeof schema>;

const state = reactive({
  nome: "",
  tipoDocumento: undefined as "CPF" | "CNPJ" | undefined,
  documento: "",
  telefone: "",
  email: "",
  endereco: "",
  imagemUrl: "",
  planoId: undefined as number | undefined,
});

const tipoDocumentoOptions = [
  { label: "CPF", value: "CPF" },
  { label: "CNPJ", value: "CNPJ" },
];

const planOptions = computed(() =>
  plans.value.map((plan) => ({
    label: plan.nome,
    value: plan.id,
  })),
);

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
  state.tipoDocumento = undefined;
  state.documento = "";
  state.telefone = "";
  state.email = "";
  state.endereco = "";
  state.imagemUrl = "";
  state.planoId = undefined;

  selectedFile.value = null;
  imagePreview.value = "";
  plans.value = [];
}

async function fetchPlans() {
  if (!props.clubeId) {
    plans.value = [];
    return;
  }

  try {
    const response = await get<PlanoOption[]>(
      `/planos?clubeId=${props.clubeId}`,
    );
    plans.value = response || [];
  } catch (error) {
    toast.add({
      title: "Erro ao carregar planos",
      description: "Não foi possível buscar os planos do clube.",
      color: "error",
    });
  }
}

async function getSignedImageUrl(path?: string | null) {
  if (!path) return "";

  try {
    const response = await $fetch<SignedUrlResponse>(
      "/socios/imagem/signed-url",
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
    console.error("Erro ao gerar signed URL:", error);
    return "";
  }
}

async function fillForm() {
  await fetchPlans();

  state.nome = props.socio?.nome || "";
  state.tipoDocumento = props.socio?.tipoDocumento || undefined;
  state.documento = props.socio?.documento || "";
  state.telefone = props.socio?.telefone || "";
  state.email = props.socio?.email || "";
  state.endereco = props.socio?.endereco || "";
  state.imagemUrl = props.socio?.imagemUrl || "";
  state.planoId = props.socio?.planoId;

  if (props.socio?.imagemPreviewUrl) {
    imagePreview.value = props.socio.imagemPreviewUrl;
  } else if (props.socio?.imagemUrl) {
    imagePreview.value = await getSignedImageUrl(props.socio.imagemUrl);
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
  formData.append("clubeId", String(props.clubeId));

  const response = await $fetch<UploadResponse>("/socios/upload-imagem", {
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
  try {
    loading.value = true;

    const uploadedImagePath = await uploadImagem();

    const payload: SocioPayload = {
      nome: event.data.nome.trim(),
      tipoDocumento: event.data.tipoDocumento ?? null,
      documento: event.data.documento?.trim()
        ? onlyNumbers(event.data.documento)
        : null,
      telefone: event.data.telefone?.trim()
        ? onlyNumbers(event.data.telefone)
        : null,
      email: event.data.email?.trim() || null,
      endereco: event.data.endereco?.trim() || null,
      imagemUrl: uploadedImagePath,
      clubeId: props.clubeId,
    };

    if (isEditing.value && props.socio?.id) {
      const socioAtualizado = await patch<Socio, SocioPayload>(
        `/socios/${props.socio.id}`,
        payload,
      );

      const planoAtualId = props.socio?.planoId;
      const novoPlanoId = state.planoId;
      const socioPlanoId = props.socio?.socioPlanoId;

      if (novoPlanoId) {
        if (socioPlanoId) {
          if (planoAtualId !== novoPlanoId) {
            await put(
              `/socio-planos/${socioPlanoId}/alterar-plano?novoPlanoId=${novoPlanoId}`,
              {},
            );
          }
        } else {
          await post<Socio, SocioPlanoCreatePayload>("/socio-planos", {
            socioId: props.socio.id,
            planoId: novoPlanoId,
          });
        }
      }

      toast.add({
        title: "Sócio atualizado",
        description: "O sócio foi atualizado com sucesso.",
        color: "success",
      });

      resetForm();
      isOpen.value = false;
      emit("updated", {
        ...socioAtualizado,
        planoId: novoPlanoId,
      });
    } else {
      const socioCriado = await post<Socio, SocioPayload>("/socios", payload);

      toast.add({
        title: "Sócio cadastrado",
        description: "O sócio foi cadastrado com sucesso.",
        color: "success",
      });

      resetForm();
      isOpen.value = false;
      emit("created", socioCriado);
    }
  } catch (error: any) {
    toast.add({
      title: isEditing.value ? "Erro ao atualizar" : "Erro ao cadastrar",
      description:
        error?.data?.message ||
        error?.message ||
        "Não foi possível salvar o sócio.",
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

watch(
  () => state.tipoDocumento,
  (tipo) => {
    if (!tipo) return;
    state.documento = maskDocument(state.documento, tipo);
  },
);
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="isEditing ? 'Editar sócio' : 'Novo sócio'"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Nome" name="nome">
          <UInput v-model="state.nome" placeholder="Digite o nome do sócio" />
        </UFormField>

        <UFormField label="Tipo de documento (opcional)" name="tipoDocumento">
          <USelect
            v-model="state.tipoDocumento"
            :items="tipoDocumentoOptions"
            value-key="value"
            option-attribute="label"
            placeholder="Selecione o tipo"
          />
        </UFormField>

        <UFormField label="Documento (opcional)" name="documento">
          <UInput
            :model-value="state.documento"
            :disabled="!state.tipoDocumento"
            :placeholder="
              state.tipoDocumento
                ? 'Digite o documento'
                : 'Selecione primeiro o tipo de documento'
            "
            @update:model-value="
              state.documento = state.tipoDocumento
                ? maskDocument(String($event || ''), state.tipoDocumento)
                : ''
            "
          />
        </UFormField>

        <UFormField label="Telefone (opcional)" name="telefone">
          <UInput
            :model-value="state.telefone"
            placeholder="Digite o telefone"
            @update:model-value="
              state.telefone = maskPhone(String($event || ''))
            "
          />
        </UFormField>

        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="Digite o email"
          />
        </UFormField>

        <UFormField label="Endereço" name="endereco">
          <UTextarea v-model="state.endereco" placeholder="Digite o endereço" />
        </UFormField>

        <UFormField v-if="isEditing" label="Plano" name="planoId">
          <USelect
            v-model="state.planoId"
            :items="planOptions"
            value-key="value"
            option-attribute="label"
            placeholder="Selecione o plano"
          />
        </UFormField>

        <UFormField label="Foto do sócio">
          <input
            type="file"
            accept="image/*"
            @change="handleFileChange"
            class="block w-full text-sm"
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
