<script setup lang="ts">
import { parseCompetenciaToApi } from "~/utils/payments";
import type {
  PagamentoLista,
  StatusPagamento,
} from "~/composables/usePayments";
import { useExport, type ExportColumn } from "~/composables/useExport";

definePageMeta({
  layout: "app-layout",
});

const { listar } = usePayments();
const { get } = useCachedApi();
const toast = useToast();
const { exportToExcel, exportToPdf } = useExport();

const clubs = ref<ClubeOptionResponse[]>([]);

const filters = reactive({
  clubeId: undefined as number | undefined,
  planoId: undefined as number | string | undefined,
  ano: String(new Date().getFullYear()),
  busca: "",
});

const { ensureActiveClubSelected } = useActiveClubSelection(filters, clubs);

type SelectOption = {
  label: string;
  value: number | string;
};

type ClubeOptionResponse = {
  id: number;
  nome: string;
  status?: string;
};

type PlanoOptionResponse = {
  id: number;
  nome: string;
};

type GridPaymentCell = {
  id?: number;
  socioId: number;
  socioNome: string;
  planoNome?: string | null;
  competencia: string;
  valorFinal: number;
  status: StatusPagamento;
  dataPagamento?: string | null;
  pagamentoOriginal?: PagamentoLista;
};

type GridRow = {
  socioId: number;
  socioNome: string;
  planoNome?: string | null;
  pagamentos: Record<string, GridPaymentCell>;
};

const loading = ref(false);
const loadingClubs = ref(false);
const loadingPlans = ref(false);

const payments = ref<PagamentoLista[]>([]);
const clubOptions = computed(() =>
  clubs.value.map((club) => ({
    label: club.nome,
    value: club.id,
  })),
);
const planOptions = ref<SelectOption[]>([]);

const openModal = ref(false);
const modalMode = ref<"quitar" | "ajustar">("quitar");
const selectedPayment = ref<PagamentoLista | null>(null);

const openCreateModal = ref(false);

const page = ref(1);
const pageCount = 10;

async function loadClubs() {
  try {
    loadingClubs.value = true;
    const response = await get<ClubeOptionResponse[]>("/clubes");

    clubs.value = response;
    ensureActiveClubSelected();
  } catch (error: any) {
    toast.add({
      title: "Erro ao carregar clubes",
      description:
        error?.data?.message || "Não foi possível carregar os clubes.",
      color: "error",
    });
  } finally {
    loadingClubs.value = false;
  }
}

async function loadPlansByClub(clubeId: number) {
  try {
    loadingPlans.value = true;

    const response = await get<PlanoOptionResponse[]>(
      `/planos?clubeId=${clubeId}`,
    );

    planOptions.value = [
      { label: "Todos os planos", value: "TODOS" },
      ...response.map((plan) => ({
        label: plan.nome,
        value: plan.id,
      })),
    ];
  } catch (error: any) {
    planOptions.value = [{ label: "Todos os planos", value: "TODOS" }];

    toast.add({
      title: "Erro ao carregar planos",
      description:
        error?.data?.message || "Não foi possível carregar os planos.",
      color: "error",
    });
  } finally {
    loadingPlans.value = false;
  }
}

function normalizeCompetenciaToGrid(value?: string | null) {
  if (!value) return "";

  if (/^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{2}\/\d{4}$/.test(value)) {
    const [mes, ano] = value.split("/");
    return `${ano}-${mes}`;
  }

  return value;
}

function extractSocioId(payment: any) {
  return (
    payment?.socioId ??
    payment?.socio?.id ??
    payment?.socio_plano?.socio?.id ??
    payment?.socioPlano?.socio?.id ??
    payment?.socioPlanoId ??
    payment?.id
  );
}

function extractSocioNome(payment: any) {
  return (
    payment?.socioNome ??
    payment?.nomeSocio ??
    payment?.socio?.nome ??
    payment?.socio_plano?.socio?.nome ??
    payment?.socioPlano?.socio?.nome ??
    "Sócio"
  );
}

function extractPlanoNome(payment: any) {
  return (
    payment?.planoNome ??
    payment?.nomePlano ??
    payment?.plano?.nome ??
    payment?.socio_plano?.plano?.nome ??
    payment?.socioPlano?.plano?.nome ??
    "-"
  );
}

const meses = computed(() => {
  const ano = Number(filters.ano) || new Date().getFullYear();

  return Array.from({ length: 12 }, (_, index) => {
    const mes = String(index + 1).padStart(2, "0");
    return `${ano}-${mes}`;
  });
});

const grid = computed<GridRow[]>(() => {
  const map = new Map<number, GridRow>();

  for (const payment of payments.value) {
    const socioId = extractSocioId(payment);
    const socioNome = extractSocioNome(payment);
    const planoNome = extractPlanoNome(payment);
    const competencia = normalizeCompetenciaToGrid(payment.competencia);

    if (!competencia || !meses.value.includes(competencia)) continue;

    if (!map.has(socioId)) {
      map.set(socioId, {
        socioId,
        socioNome,
        planoNome,
        pagamentos: {},
      });
    }

    map.get(socioId)!.pagamentos[competencia] = {
      id: payment.id,
      socioId,
      socioNome,
      planoNome,
      competencia,
      valorFinal: Number(payment.valorFinal ?? 0),
      status: payment.status,
      dataPagamento: payment.dataPagamento ?? null,
      pagamentoOriginal: payment,
    };
  }

  return Array.from(map.values()).sort((a, b) =>
    a.socioNome.localeCompare(b.socioNome, "pt-BR"),
  );
});

const totalRows = computed(() => grid.value.length);

const paginatedGrid = computed<GridRow[]>(() => {
  const start = (page.value - 1) * pageCount;
  const end = start + pageCount;

  return grid.value.slice(start, end);
});

async function loadGrid() {
  if (!filters.clubeId) {
    payments.value = [];
    page.value = 1;
    return;
  }

  try {
    loading.value = true;

    payments.value = await listar({
      clubeId: filters.clubeId,
      planoId:
        filters.planoId && filters.planoId !== "TODOS"
          ? Number(filters.planoId)
          : null,
      competencia: null,
      status: null,
      busca: filters.busca || null,
    });

    page.value = 1;
  } catch (error: any) {
    toast.add({
      title: "Erro ao carregar planilha",
      description: error?.data?.message || "Tente novamente.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function formatMes(competencia: string) {
  const monthMap = [
    "JAN",
    "FEV",
    "MAR",
    "ABR",
    "MAI",
    "JUN",
    "JUL",
    "AGO",
    "SET",
    "OUT",
    "NOV",
    "DEZ",
  ];

  const [, month] = competencia.split("-");
  return monthMap[Number(month) - 1] ?? competencia;
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function getCellClass(status?: StatusPagamento) {
  if (!status) {
    return "bg-gray-50 text-gray-400 hover:bg-gray-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700";
  }

  return {
    "bg-green-500/15 text-green-700 hover:bg-green-500/20 dark:bg-green-500/20 dark:text-green-300 dark:hover:bg-green-500/30":
      status === "PAGO",
    "bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-200 dark:hover:bg-yellow-500/30":
      status === "PENDENTE",
    "bg-red-500/15 text-red-700 hover:bg-red-500/20 dark:bg-red-500/20 dark:text-red-200 dark:hover:bg-red-500/30":
      status === "ATRASADO",
  };
}

function handleCellClick(row: GridRow, mes: string) {
  const payment = row.pagamentos[mes]?.pagamentoOriginal;

  if (!payment) {
    toast.add({
      title: "Pagamento não encontrado",
      description:
        "Para criar um pagamento nessa competência, use o botão Novo pagamento.",
      color: "warning",
    });
    return;
  }

  selectedPayment.value = payment;

  if (payment.status === "PENDENTE" || payment.status === "ATRASADO") {
    modalMode.value = "quitar";
  } else {
    modalMode.value = "ajustar";
  }

  openModal.value = true;
}

function getRowTotal(row: GridRow) {
  return meses.value.reduce((total, mes) => {
    return total + Number(row.pagamentos[mes]?.valorFinal ?? 0);
  }, 0);
}

const exportColumns = computed<ExportColumn[]>(() => [
  { header: "Sócio", key: "socioNome" },
  {
    header: "Plano",
    key: "planoNome",
    format: (value) => String(value || "-"),
  },
  ...meses.value.map((mes) => ({
    header: formatMes(mes),
    key: mes,
    format: (value: unknown) => formatCurrency(value as number),
  })),
  {
    header: "Total",
    key: "total",
    format: (value) => formatCurrency(value as number),
  },
]);

const exportRows = computed<Record<string, unknown>[]>(() =>
  grid.value.map((row) => ({
    socioNome: row.socioNome,
    planoNome: row.planoNome || "-",
    ...Object.fromEntries(
      meses.value.map((mes) => [mes, row.pagamentos[mes]?.valorFinal ?? 0]),
    ),
    total: getRowTotal(row),
  })),
);

async function baixarPlanilha(formato: "pdf" | "xlsx") {
  const filename = `planilha-mensalidades-${filters.ano}`;

  if (formato === "pdf") {
    await exportToPdf(
      exportRows.value,
      exportColumns.value,
      `${filename}.pdf`,
      {
        title: `Planilha de mensalidades - ${filters.ano}`,
        landscape: true,
      },
    );
    return;
  }

  await exportToExcel(
    exportRows.value,
    exportColumns.value,
    `${filename}.xlsx`,
  );
}

watch(
  () => filters.clubeId,
  async (newClubId) => {
    filters.planoId = undefined;
    payments.value = [];
    planOptions.value = [];
    page.value = 1;

    if (!newClubId) return;

    await loadPlansByClub(newClubId);
    await loadGrid();
  },
);

watch(
  () => [filters.planoId, filters.ano, filters.busca],
  () => {
    page.value = 1;
  },
);

watch(totalRows, () => {
  const maxPage = Math.max(1, Math.ceil(totalRows.value / pageCount));

  if (page.value > maxPage) {
    page.value = maxPage;
  }
});

watch(
  () => filters.ano,
  () => {
    // aqui só muda as colunas do grid
  },
);

onMounted(async () => {
  await loadClubs();
});
</script>

<template>
  <UPage>
    <UPageHeader
      title="Planilha de mensalidades"
      description="Visualize os pagamentos dos sócios em formato de planilha."
    />

    <UPageBody>
      <UCard class="mb-4">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <UFormField label="Clube">
            <USelect
              v-model="filters.clubeId"
              :items="clubOptions"
              :loading="loadingClubs"
              placeholder="Selecione o clube"
              class="cursor-pointer"
              :ui="{
                item: 'cursor-pointer',
              }"
            />
          </UFormField>

          <UFormField label="Plano">
            <USelect
              v-model="filters.planoId"
              :items="planOptions"
              :loading="loadingPlans"
              placeholder="Todos os planos"
              :disabled="!filters.clubeId"
              class="cursor-pointer"
              :ui="{
                item: 'cursor-pointer',
              }"
            />
          </UFormField>

          <UFormField label="Ano">
            <UInput v-model="filters.ano" placeholder="2026" />
          </UFormField>

          <UFormField label="Busca">
            <UInput
              v-model="filters.busca"
              icon="i-lucide-search"
              placeholder="Nome do sócio"
            />
          </UFormField>

          <div class="flex items-end">
            <UButton
              icon="i-lucide-search"
              label="Buscar"
              @click="loadGrid"
              class="w-full cursor-pointer"
            />
          </div>
        </div>

        <div class="mt-4 flex justify-between">
          <UButton
            icon="i-lucide-plus"
            label="Novo pagamento"
            :disabled="!filters.clubeId"
            @click="openCreateModal = true"
            class="cursor-pointer"
          />

          <div class="flex flex-wrap justify-end gap-2">
            <UButton
              label="PDF"
              icon="i-lucide-file-down"
              color="neutral"
              variant="soft"
              :disabled="loading || exportRows.length === 0"
              @click="baixarPlanilha('pdf')"
            />
            <UButton
              label="Excel"
              icon="i-lucide-file-spreadsheet"
              color="neutral"
              variant="soft"
              :disabled="loading || exportRows.length === 0"
              @click="baixarPlanilha('xlsx')"
            />
            <UButton
              to="/payments"
              icon="i-lucide-list"
              label="Ver listagem"
              variant="soft"
              class="cursor-pointer"
            />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="relative overflow-auto">
          <table
            class="min-w-[1650px] w-full border-separate border-spacing-0 text-sm"
          >
            <thead class="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th
                  class="min-w-[320px] border-b border-r border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  Sócio
                </th>

                <th
                  class="min-w-[220px] border-b border-r border-gray-200 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  Plano
                </th>

                <th
                  v-for="mes in meses"
                  :key="mes"
                  class="min-w-[110px] border-b border-r border-gray-200 bg-gray-50 px-3 py-3 text-center font-semibold text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {{ formatMes(mes) }}
                </th>

                <th
                  class="min-w-[140px] border-b border-gray-200 bg-gray-50 px-4 py-3 text-center font-semibold text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  Total
                </th>
              </tr>
            </thead>

            <tbody v-if="!loading && paginatedGrid.length">
              <tr
                v-for="(row, index) in paginatedGrid"
                :key="row.socioId"
                :class="
                  index % 2 === 0
                    ? 'bg-white dark:bg-slate-900'
                    : 'bg-gray-50/40 dark:bg-slate-800/70'
                "
              >
                <td
                  class="border-b border-r border-gray-200 px-4 py-3 font-medium text-gray-900 dark:border-slate-700 dark:text-slate-100"
                  :class="
                    index % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-gray-50/40 dark:bg-slate-800/70'
                  "
                >
                  {{ row.socioNome }}
                </td>

                <td
                  class="border-b border-r border-gray-200 px-4 py-3 text-gray-600 dark:border-slate-700 dark:text-slate-300"
                  :class="
                    index % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-gray-50/40 dark:bg-slate-800/70'
                  "
                >
                  {{ row.planoNome || "-" }}
                </td>

                <td
                  v-for="mes in meses"
                  :key="`${row.socioId}-${mes}`"
                  class="border-b border-r border-gray-200 p-1 dark:border-slate-700"
                >
                  <button
                    type="button"
                    class="flex h-[42px] w-full cursor-pointer items-center justify-center rounded-md px-2 text-center text-xs font-medium transition"
                    :class="getCellClass(row.pagamentos[mes]?.status)"
                    @click="handleCellClick(row, mes)"
                  >
                    <template v-if="row.pagamentos[mes]">
                      {{ formatCurrency(row.pagamentos[mes].valorFinal) }}
                    </template>

                    <template v-else> — </template>
                  </button>
                </td>

                <td
                  class="border-b border-gray-200 px-4 py-3 text-center font-semibold text-gray-900 dark:border-slate-700 dark:text-slate-100"
                  :class="
                    index % 2 === 0
                      ? 'bg-white dark:bg-slate-900'
                      : 'bg-gray-50/40 dark:bg-slate-800/70'
                  "
                >
                  {{ formatCurrency(getRowTotal(row)) }}
                </td>
              </tr>
            </tbody>

            <tbody v-else-if="loading">
              <tr>
                <td
                  :colspan="meses.length + 3"
                  class="py-10 text-center text-sm text-gray-500 dark:text-slate-300"
                >
                  Carregando planilha...
                </td>
              </tr>
            </tbody>

            <tbody v-else>
              <tr>
                <td
                  :colspan="meses.length + 3"
                  class="py-10 text-center text-sm text-gray-500 dark:text-slate-300"
                >
                  Nenhum dado encontrado.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="!loading && totalRows > 0"
          class="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 md:flex-row md:items-center md:justify-between dark:border-slate-700"
        >
          <div class="text-sm text-gray-500 dark:text-slate-300">
            Mostrando
            <span class="font-medium text-gray-900 dark:text-slate-100">
              {{ (page - 1) * pageCount + 1 }}
            </span>
            até
            <span class="font-medium text-gray-900 dark:text-slate-100">
              {{ Math.min(page * pageCount, totalRows) }}
            </span>
            de
            <span class="font-medium text-gray-900 dark:text-slate-100">
              {{ totalRows }}
            </span>
            sócios
          </div>

          <UPagination
            v-model:page="page"
            :total="totalRows"
            :items-per-page="pageCount"
            show-first
            show-last
            class="cursor-pointer"
            :ui="{
              item: 'cursor-pointer',
              first: 'cursor-pointer',
              last: 'cursor-pointer',
              prev: 'cursor-pointer',
              next: 'cursor-pointer',
            }"
          />
        </div>
      </UCard>

      <PaymentsPaymentCreateModal
        v-model:open="openCreateModal"
        :clube-id="filters.clubeId ?? null"
        :plano-id="
          filters.planoId && filters.planoId !== 'TODOS'
            ? Number(filters.planoId)
            : null
        "
        @success="loadGrid"
      />

      <PaymentsPaymentFormModal
        v-model:open="openModal"
        :payment="selectedPayment"
        :mode="modalMode"
        @success="loadGrid"
      />
    </UPageBody>
  </UPage>
</template>
