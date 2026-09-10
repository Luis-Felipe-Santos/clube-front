<script setup lang="ts">
import { h, resolveComponent } from "vue";
import PlanFormModal from "./planFormModal.vue";
import { useExport, type ExportColumn } from "~/composables/useExport";

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
  status?: string;
};

const clubes = ref<ClubeOption[]>([]);
const clubeSelecionadoId = ref<number | undefined>(undefined);

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");

const toast = useToast();
const { get, del } = useCachedApi();
const { exportToExcel, exportToPdf } = useExport();
const { ensureActiveClubSelected } = useActiveClubSelection(
  clubeSelecionadoId,
  clubes,
);

const openModal = ref(false);
const loading = ref(false);
const search = ref("");
const planos = ref<Plano[]>([]);
const selectedPlano = ref<Plano | null>(null);

const page = ref(1);
const pageCount = 10;

const clubeOptions = computed(() =>
  clubes.value.map((clube) => ({
    label: clube.nome,
    value: clube.id,
  })),
);

const filteredPlanos = computed(() => {
  const term = search.value.toLowerCase().trim();

  if (!term) return planos.value;

  return planos.value.filter((plano) => {
    const nome = plano.nome?.toLowerCase() || "";
    const periodicidade = plano.periodicidade?.toLowerCase() || "";
    const status = plano.status?.toLowerCase() || "";
    const valor = String(plano.valor ?? "");

    return (
      nome.includes(term) ||
      periodicidade.includes(term) ||
      status.includes(term) ||
      valor.includes(term)
    );
  });
});

const paginatedPlanos = computed(() => {
  const start = (page.value - 1) * pageCount;
  const end = start + pageCount;
  return filteredPlanos.value.slice(start, end);
});

function formatCurrency(value?: number) {
  if (value == null) return "N/A";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

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

async function fetchClubes() {
  try {
    const response = await get<ClubeOption[]>("/clubes");
    clubes.value = response;
    ensureActiveClubSelected();
  } catch (error) {
    console.error("Erro ao buscar clubes:", error);

    toast.add({
      title: "Erro ao carregar clubes",
      description: "Não foi possível buscar os clubes.",
      color: "error",
    });
  }
}

async function fetchPlanos() {
  if (!clubeSelecionadoId.value) {
    planos.value = [];
    return;
  }

  try {
    loading.value = true;
    const response = await get<Plano[]>(
      `/planos?clubeId=${clubeSelecionadoId.value}`,
    );
    planos.value = response;
  } catch (error) {
    console.error("Erro ao buscar planos:", error);

    toast.add({
      title: "Erro ao carregar planos",
      description: "Não foi possível buscar os planos.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function novoPlano() {
  if (!clubeSelecionadoId.value) {
    toast.add({
      title: "Selecione um clube",
      description: "Escolha um clube antes de cadastrar um plano.",
      color: "warning",
    });
    return;
  }

  selectedPlano.value = null;
  openModal.value = true;
}

function editarPlano(plano: Plano) {
  selectedPlano.value = {
    ...plano,
    clubeId: clubeSelecionadoId.value,
  };
  openModal.value = true;
}

async function deletarPlano(plano: Plano) {
  const confirmado = window.confirm(
    `Tem certeza que deseja deletar o plano "${plano.nome}"?`,
  );

  if (!confirmado) return;

  try {
    await del(`/planos/${plano.id}`);

    toast.add({
      title: "Plano deletado",
      description: "O plano foi removido com sucesso.",
      color: "success",
    });

    fetchPlanos();
  } catch (error: any) {
    console.error("Erro ao deletar plano:", error);

    toast.add({
      title: "Erro ao deletar",
      description: error?.data?.message || "Não foi possível deletar o plano.",
      color: "error",
    });
  }
}

function handleSuccess() {
  openModal.value = false;
  selectedPlano.value = null;
  fetchPlanos();
}

const exportColumns: ExportColumn[] = [
  { header: "Nome", key: "nome" },
  {
    header: "Valor",
    key: "valor",
    format: (value) => formatCurrency(Number(value)),
  },
  {
    header: "Periodicidade",
    key: "periodicidade",
    format: (value) =>
      ({
        MENSAL: "Mensal",
        TRIMESTRAL: "Trimestral",
        SEMESTRAL: "Semestral",
        ANUAL: "Anual",
      })[String(value)] || "N/A",
  },
  {
    header: "Status",
    key: "status",
    format: (value) => String(value || "N/A"),
  },
];

async function baixarPlanos(formato: "pdf" | "xlsx") {
  const rows = filteredPlanos.value as Record<string, unknown>[];
  const filename = `planos-${new Date().toISOString().slice(0, 10)}`;

  if (formato === "pdf") {
    await exportToPdf(rows, exportColumns, `${filename}.pdf`, {
      title: "Planos",
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
    accessorKey: "valor",
    header: "Valor",
    cell: ({ row }: any) => formatCurrency(row.original.valor),
  },
  {
    accessorKey: "periodicidade",
    header: "Periodicidade",
    cell: ({ row }: any) => {
      const periodicidade = row.original.periodicidade;

      const labels: Record<string, string> = {
        MENSAL: "Mensal",
        TRIMESTRAL: "Trimestral",
        SEMESTRAL: "Semestral",
        ANUAL: "Anual",
      };

      return labels[periodicidade] || "N/A";
    },
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
      const plano = row.original;

      return h(
        UDropdownMenu,
        {
          items: [
            [
              {
                label: "Editar",
                icon: "i-lucide-pencil",
                onSelect: () => editarPlano(plano),
                class: "cursor-pointer",
              },
              {
                label: "Deletar",
                icon: "i-material-symbols:delete-outline",
                onSelect: () => deletarPlano(plano),
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

onMounted(async () => {
  await fetchClubes();
  await fetchPlanos();
});

watch(search, () => {
  page.value = 1;
});

watch(clubeSelecionadoId, () => {
  page.value = 1;
  fetchPlanos();
});

watch(openModal, (value) => {
  if (!value) {
    selectedPlano.value = null;
  }
});
</script>

<template>
  <UCard>
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div class="w-full sm:w-64">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Buscar plano..."
          />
        </div>

        <div class="w-full sm:w-56">
          <USelect
            v-model="clubeSelecionadoId"
            :items="clubeOptions"
            value-key="value"
            option-attribute="label"
            placeholder="Selecione o clube"
            class="cursor-pointer"
            :ui="{
              item: 'cursor-pointer',
            }"
          />
        </div>
      </div>

      <div class="flex justify-end">
        <div class="flex flex-wrap justify-end gap-2">
          <UButton
            label="PDF"
            icon="i-lucide-file-down"
            color="neutral"
            variant="soft"
            :disabled="loading || filteredPlanos.length === 0"
            @click="baixarPlanos('pdf')"
          />
          <UButton
            label="Excel"
            icon="i-lucide-file-spreadsheet"
            color="neutral"
            variant="soft"
            :disabled="loading || filteredPlanos.length === 0"
            @click="baixarPlanos('xlsx')"
          />
          <UButton
            label="Novo plano"
            icon="i-lucide-plus"
            @click="novoPlano"
            class="cursor-pointer"
          />
        </div>
      </div>
    </div>

    <div class="mt-4">
      <UTable :data="paginatedPlanos" :columns="columns" :loading="loading" />
    </div>

    <div
      v-if="!loading && paginatedPlanos.length === 0"
      class="py-10 text-center text-sm text-gray-500"
    >
      Nenhum plano encontrado.
    </div>

    <div class="mt-4 flex justify-end">
      <UPagination
        v-model:page="page"
        :items-per-page="pageCount"
        :total="filteredPlanos.length"
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

  <PlanFormModal
    v-model:open="openModal"
    :plano="selectedPlano"
    :clubes="clubes"
    @success="handleSuccess"
  />
</template>
