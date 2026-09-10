<script setup lang="ts">
import { h, resolveComponent } from "vue";
import DependentFormModal from "~/components/dependents/dependentFormModal.vue";
import { useExport, type ExportColumn } from "~/composables/useExport";

type Dependente = {
  id: number;
  nome: string;
  parentesco: string;
  imagemUrl?: string;
  imagemPreviewUrl?: string;
  status?: "ATIVO" | "INATIVO";
};

const props = defineProps<{
  socioId: number;
  socioNome?: string;
}>();

const UAvatar = resolveComponent("UAvatar");
const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");

const toast = useToast();
const { get, patch } = useCachedApi();
const { exportToExcel, exportToPdf } = useExport();

const dependentes = ref<Dependente[]>([]);
const loading = ref(false);
const search = ref("");

const openModal = ref(false);
const selectedDependente = ref<Dependente | null>(null);

const openImageModal = ref(false);
const selectedImage = ref("");
const selectedImageName = ref("");

const filteredDependentes = computed(() => {
  const term = search.value.toLowerCase().trim();

  if (!term) return dependentes.value;

  return dependentes.value.filter((dependente) => {
    return (
      dependente.nome?.toLowerCase().includes(term) ||
      dependente.parentesco?.toLowerCase().includes(term)
    );
  });
});

function getStatusColor(status?: string) {
  switch (status) {
    case "ATIVO":
      return "success";
    case "INATIVO":
      return "warning";
    default:
      return "neutral";
  }
}

function visualizarImagem(imagem?: string, nome?: string) {
  if (!imagem) return;

  selectedImage.value = imagem;
  selectedImageName.value = nome || "Imagem";
  openImageModal.value = true;
}

async function fetchDependentes() {
  if (!props.socioId) {
    dependentes.value = [];
    return;
  }

  try {
    loading.value = true;

    const response = await get<Dependente[]>(
      `/dependentes/socio/${props.socioId}`,
    );

    const dependentesComImagem = await Promise.all(
      response.map(async (dependente) => {
        if (!dependente.imagemUrl) return dependente;

        try {
          const result = await get<{ signedUrl: string }>(
            `/dependentes/imagem/signed-url?path=${encodeURIComponent(dependente.imagemUrl)}`,
          );

          return {
            ...dependente,
            imagemPreviewUrl: result.signedUrl,
          };
        } catch (error) {
          console.error("ERRO AO GERAR SIGNED URL DO DEPENDENTE:", error);
          return dependente;
        }
      }),
    );

    dependentes.value = dependentesComImagem;
  } catch (error) {
    toast.add({
      title: "Erro ao carregar dependentes",
      description: "Não foi possível buscar os dependentes.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function novoDependente() {
  selectedDependente.value = null;
  openModal.value = true;
}

function editarDependente(dependente: Dependente) {
  selectedDependente.value = dependente;
  openModal.value = true;
}

async function inativarDependente(dependente: Dependente) {
  try {
    await patch(`/dependentes/${dependente.id}/inativar`);

    toast.add({
      title: "Dependente inativado",
      description: "O dependente foi inativado com sucesso.",
      color: "success",
    });

    await fetchDependentes();
  } catch (error: any) {
    toast.add({
      title: "Erro ao inativar",
      description: error?.data?.message || "Não foi possível inativar.",
      color: "error",
    });
  }
}

async function reativarDependente(dependente: Dependente) {
  try {
    await patch(`/dependentes/${dependente.id}/reativar`);

    toast.add({
      title: "Dependente reativado",
      description: "O dependente foi reativado com sucesso.",
      color: "success",
    });

    await fetchDependentes();
  } catch (error: any) {
    toast.add({
      title: "Erro ao reativar",
      description: error?.data?.message || "Não foi possível reativar.",
      color: "error",
    });
  }
}

async function handleSaved() {
  openModal.value = false;
  selectedDependente.value = null;
  await fetchDependentes();
}

const exportColumns: ExportColumn[] = [
  { header: "Nome", key: "nome" },
  { header: "Parentesco", key: "parentesco" },
  {
    header: "Status",
    key: "status",
    format: (value) => String(value || "ATIVO"),
  },
];

async function baixarDependentes(formato: "pdf" | "xlsx") {
  const rows = filteredDependentes.value as Record<string, unknown>[];
  const filename = `dependentes-${new Date().toISOString().slice(0, 10)}`;

  if (formato === "pdf") {
    await exportToPdf(rows, exportColumns, `${filename}.pdf`, {
      title: "Dependentes",
    });
    return;
  }

  await exportToExcel(rows, exportColumns, `${filename}.xlsx`);
}

const columns = [
  {
    accessorKey: "imagemPreviewUrl",
    header: "Foto",
    cell: ({ row }: any) => {
      const dependente = row.original;
      const imagem = dependente.imagemPreviewUrl;
      const isUrl = typeof imagem === "string" && imagem.startsWith("http");

      return h(
        "button",
        {
          type: "button",
          class:
            "cursor-zoom-in rounded-full transition duration-200 hover:scale-105 hover:opacity-90",
          onClick: () => visualizarImagem(imagem, dependente.nome),
        },
        [
          h(UAvatar, {
            src: isUrl ? imagem : undefined,
            alt: dependente.nome,
            text: dependente.nome,
            size: "lg",
          }),
        ],
      );
    },
  },
  {
    accessorKey: "nome",
    header: "Nome",
  },
  {
    accessorKey: "parentesco",
    header: "Parentesco",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: any) => {
      const status = row.original.status || "ATIVO";

      return h(
        UBadge,
        {
          color: getStatusColor(status),
          variant: "subtle",
        },
        () => status,
      );
    },
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }: any) => {
      const dependente = row.original;

      const items = [
        [
          {
            label: "Editar",
            icon: "i-lucide-pencil",
            onSelect: () => editarDependente(dependente),
            class: "cursor-pointer",
          },
          dependente.status === "ATIVO"
            ? {
                label: "Inativar",
                icon: "i-lucide-user-minus",
                onSelect: () => inativarDependente(dependente),
                class: "cursor-pointer",
              }
            : {
                label: "Reativar",
                icon: "i-lucide-user-check",
                onSelect: () => reativarDependente(dependente),
                class: "cursor-pointer",
              },
        ],
      ];

      return h(
        UDropdownMenu,
        { items },
        {
          default: () =>
            h(UButton, {
              icon: "i-lucide-ellipsis-vertical",
              color: "neutral",
              variant: "ghost",
            }),
        },
      );
    },
  },
];

watch(
  () => props.socioId,
  () => {
    fetchDependentes();
  },
  { immediate: true },
);
</script>

<template>
  <UCard>
    <div class="mb-4 flex items-center justify-between gap-4">
      <div>
        <h3 class="text-lg font-semibold">Dependentes</h3>
        <p class="text-sm text-gray-500">
          {{ socioNome ? `Sócio: ${socioNome}` : "Gerencie os dependentes" }}
        </p>
      </div>

      <div class="flex flex-wrap justify-end gap-2">
        <UButton
          label="PDF"
          icon="i-lucide-file-down"
          color="neutral"
          variant="soft"
          :disabled="loading || filteredDependentes.length === 0"
          @click="baixarDependentes('pdf')"
        />
        <UButton
          label="Excel"
          icon="i-lucide-file-spreadsheet"
          color="neutral"
          variant="soft"
          :disabled="loading || filteredDependentes.length === 0"
          @click="baixarDependentes('xlsx')"
        />
        <UButton
          label="Novo dependente"
          icon="i-lucide-plus"
          color="success"
          @click="novoDependente"
          class="cursor-pointer"
        />
      </div>
    </div>

    <div class="mb-4 max-w-sm">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Buscar dependente..."
      />
    </div>

    <UTable :data="filteredDependentes" :columns="columns" :loading="loading" />

    <DependentFormModal
      v-model:open="openModal"
      :dependente="selectedDependente"
      :socio-id="socioId"
      @created="handleSaved"
      @updated="handleSaved"
    />

    <UModal v-model:open="openImageModal" fullscreen>
      <template #content>
        <div
          class="relative flex h-screen w-full items-center justify-center bg-black/95 p-4"
          @click="openImageModal = false"
        >
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            class="absolute right-4 top-4 z-10"
            @click.stop="openImageModal = false"
          />

          <div
            class="flex w-full max-w-6xl flex-col items-center gap-4"
            @click.stop
          >
            <div class="text-center">
              <p class="text-lg font-semibold text-white">
                {{ selectedImageName }}
              </p>
              <p class="text-sm text-gray-400">
                Clique fora ou no X para fechar
              </p>
            </div>

            <div
              class="flex w-full items-center justify-center overflow-hidden rounded-2xl"
            >
              <img
                v-if="selectedImage"
                :src="selectedImage"
                :alt="selectedImageName"
                class="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </UCard>
</template>
