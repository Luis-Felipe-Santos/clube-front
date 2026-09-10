<script setup lang="ts">
import { h, resolveComponent } from "vue";
import ClubFormModal from "./clubFormModal.vue";
import { maskCnpj } from "~/utils/masks";
import { useExport, type ExportColumn } from "~/composables/useExport";

type Clube = {
  id: number;
  nome: string;
  cnpj?: string;
  status?: "ATIVO" | "INATIVO" | "BLOQUEADO";
};

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");

const toast = useToast();
const { get } = useCachedApi();
const { exportToExcel, exportToPdf } = useExport();

const openModal = ref(false);
const loading = ref(false);
const search = ref("");
const clubes = ref<Clube[]>([]);
const selectedClube = ref<Clube | null>(null);

const page = ref(1);
const pageCount = 10;

const filteredClubes = computed(() => {
  const term = search.value.toLowerCase().trim();
  const normalizedTerm = term.replace(/\D/g, "");

  if (!term) return clubes.value;

  return clubes.value.filter((clube) => {
    const nome = clube.nome?.toLowerCase() || "";
    const status = clube.status?.toLowerCase() || "";
    const cnpj = clube.cnpj || "";
    const cnpjNumbers = cnpj.replace(/\D/g, "");

    const matchesNome = nome.includes(term);
    const matchesStatus = status.includes(term);
    const matchesCnpj =
      normalizedTerm.length > 0 && cnpjNumbers.includes(normalizedTerm);

    return matchesNome || matchesStatus || matchesCnpj;
  });
});

const paginatedClubes = computed(() => {
  const start = (page.value - 1) * pageCount;
  const end = start + pageCount;
  return filteredClubes.value.slice(start, end);
});

function getStatusColor(status?: string) {
  switch (status) {
    case "ATIVO":
      return "success";
    case "INATIVO":
      return "warning";
    case "BLOQUEADO":
      return "error";
    default:
      return "neutral";
  }
}

async function fetchClubes() {
  try {
    loading.value = true;
    const response = await get<Clube[]>("/clubes");
    clubes.value = response;
  } catch (error) {
    console.error("Erro ao buscar clubes:", error);

    toast.add({
      title: "Erro ao carregar clubes",
      description: "Não foi possível buscar os clubes.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function novoClube() {
  selectedClube.value = null;
  openModal.value = true;
}

function editarClube(clube: Clube) {
  selectedClube.value = { ...clube };
  openModal.value = true;
}

function handleSuccess() {
  openModal.value = false;
  selectedClube.value = null;
  fetchClubes();
}

const exportColumns: ExportColumn[] = [
  { header: "Nome", key: "nome" },
  {
    header: "CNPJ",
    key: "cnpj",
    format: (value) => (value ? maskCnpj(String(value)) : "N/A"),
  },
  {
    header: "Status",
    key: "status",
    format: (value) => String(value || "N/A"),
  },
];

async function baixarClubes(formato: "pdf" | "xlsx") {
  const rows = filteredClubes.value as Record<string, unknown>[];
  const filename = `clubes-${new Date().toISOString().slice(0, 10)}`;

  if (formato === "pdf") {
    await exportToPdf(rows, exportColumns, `${filename}.pdf`, {
      title: "Clubes",
    });
    return;
  }

  await exportToExcel(rows, exportColumns, `${filename}.xlsx`);
}

const columns = [
  {
    accessorKey: "nome",
    header: "Nome",
  },
  {
    accessorKey: "cnpj",
    header: "CNPJ",
    cell: ({ row }: any) =>
      row.original.cnpj ? maskCnpj(row.original.cnpj) : "N/A",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }: any) => {
      const status = row.original.status;

      return h(
        UBadge,
        {
          color: getStatusColor(status),
          variant: "subtle",
        },
        () => status || "N/A",
      );
    },
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }: any) => {
      const clube = row.original;

      return h(
        UDropdownMenu,
        {
          items: [
            [
              {
                label: "Editar",
                icon: "i-lucide-pencil",
                onSelect: () => editarClube(clube),
                class: "cursor-pointer",
              },
            ],
          ],
        },
        {
          default: () =>
            h(UButton, {
              icon: "i-lucide-ellipsis-vertical",
              color: "neutral",
              variant: "ghost",
              class: "cursor-pointer",
            }),
        },
      );
    },
  },
];

onMounted(fetchClubes);

watch(search, () => {
  page.value = 1;
});

watch(openModal, (value) => {
  if (!value) {
    selectedClube.value = null;
  }
});
</script>

<template>
  <UCard>
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="w-full sm:max-w-sm">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Buscar clube..."
        />
      </div>

      <div class="flex flex-wrap justify-end gap-2">
        <UButton
          label="PDF"
          icon="i-lucide-file-down"
          color="neutral"
          variant="soft"
          :disabled="loading || filteredClubes.length === 0"
          @click="baixarClubes('pdf')"
        />
        <UButton
          label="Excel"
          icon="i-lucide-file-spreadsheet"
          color="neutral"
          variant="soft"
          :disabled="loading || filteredClubes.length === 0"
          @click="baixarClubes('xlsx')"
        />
        <UButton
          label="Novo clube"
          class="cursor-pointer"
          icon="i-lucide-plus"
          @click="novoClube"
        />
      </div>
    </div>

    <div class="mt-4">
      <UTable :data="paginatedClubes" :columns="columns" :loading="loading" />
    </div>

    <div
      v-if="!loading && paginatedClubes.length === 0"
      class="py-10 text-center text-sm text-gray-500"
    >
      Nenhum clube encontrado.
    </div>

    <div class="mt-4 flex justify-end">
      <UPagination
        v-model:page="page"
        :items-per-page="pageCount"
        :total="filteredClubes.length"
        :ui="{
          item: 'cursor-pointer',
          prev: 'cursor-pointer',
          next: 'cursor-pointer',
          first: 'cursor-pointer',
          last: 'cursor-pointer',
        }"
      />
    </div>
  </UCard>

  <ClubFormModal
    v-model:open="openModal"
    :clube="selectedClube"
    @success="handleSuccess"
  />
</template>
