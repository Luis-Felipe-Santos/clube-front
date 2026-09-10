<script setup lang="ts">
import PaymentsTable from "~/components/payments/paymentsTable.vue";
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
  competencia: "" as string,
  status: "TODOS" as "TODOS" | StatusPagamento,
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

/** PAGINAÇÃO */
const page = ref(1);
const pageCount = 10;

const totalItems = computed(() => payments.value.length);

const paginatedPayments = computed(() => {
  const start = (page.value - 1) * pageCount;
  const end = start + pageCount;

  return payments.value.slice(start, end);
});

const exportColumns: ExportColumn[] = [
  { header: "Sócio", key: "socioNome" },
  { header: "Plano", key: "planoNome" },
  {
    header: "Competência",
    key: "competencia",
    format: (value) => formatCompetencia(String(value || "")),
  },
  {
    header: "Valor",
    key: "valorFinal",
    format: (value) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(value || 0)),
  },
  {
    header: "Vencimento",
    key: "dataVencimento",
    format: (value) =>
      value ? new Date(String(value)).toLocaleDateString("pt-BR") : "-",
  },
  { header: "Status", key: "status" },
  {
    header: "Data pagamento",
    key: "dataPagamento",
    format: (value) =>
      value ? new Date(String(value)).toLocaleDateString("pt-BR") : "-",
  },
];

async function baixarPagamentos(formato: "pdf" | "xlsx") {
  const rows = payments.value as Record<string, unknown>[];
  const filename = `pagamentos-${new Date().toISOString().slice(0, 10)}`;

  if (formato === "pdf") {
    await exportToPdf(rows, exportColumns, `${filename}.pdf`, {
      title: "Pagamentos",
      landscape: true,
    });
    return;
  }

  await exportToExcel(rows, exportColumns, `${filename}.xlsx`);
}

const statusOptions = [
  { label: "Todos os status", value: "TODOS" },
  { label: "Pendente", value: "PENDENTE" },
  { label: "Pago", value: "PAGO" },
  { label: "Atrasado", value: "ATRASADO" },
];

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

async function loadPayments() {
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
      competencia: parseCompetenciaToApi(filters.competencia),
      status: filters.status === "TODOS" ? null : filters.status,
      busca: filters.busca || null,
    });

    page.value = 1;
  } catch (error: any) {
    toast.add({
      title: "Erro ao carregar pagamentos",
      description: error?.data?.message || "Tente novamente.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function openQuitarModal(payment: PagamentoLista) {
  selectedPayment.value = payment;
  modalMode.value = "quitar";
  openModal.value = true;
}

function openAjustarModal(payment: PagamentoLista) {
  selectedPayment.value = payment;
  modalMode.value = "ajustar";
  openModal.value = true;
}

watch(
  () => filters.clubeId,
  async (newClubId) => {
    filters.planoId = undefined;
    planOptions.value = [];
    page.value = 1;

    if (!newClubId) return;

    await loadPlansByClub(newClubId);
    await loadPayments();
  },
);

onMounted(async () => {
  await loadClubs();
});
</script>

<template>
  <UPage>
    <UPageHeader
      title="Pagamentos"
      description="Gerencie os pagamentos dos sócios."
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

          <UFormField label="Competência">
            <UInput v-model="filters.competencia" placeholder="MM/AAAA" />
          </UFormField>

          <UFormField label="Status">
            <USelect
              v-model="filters.status"
              :items="statusOptions"
              placeholder="Todos os status"
              class="cursor-pointer"
              :ui="{
                item: 'cursor-pointer',
              }"
            />
          </UFormField>

          <UFormField label="Busca">
            <UInput
              v-model="filters.busca"
              icon="i-lucide-search"
              placeholder="Nome do sócio"
            />
          </UFormField>
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
              :disabled="loading || payments.length === 0"
              @click="baixarPagamentos('pdf')"
            />
            <UButton
              label="Excel"
              icon="i-lucide-file-spreadsheet"
              color="neutral"
              variant="soft"
              :disabled="loading || payments.length === 0"
              @click="baixarPagamentos('xlsx')"
            />
            <UButton
              icon="i-lucide-search"
              label="Buscar pagamentos"
              @click="loadPayments"
              class="cursor-pointer"
            />
          </div>
        </div>
      </UCard>

      <PaymentsTable
        :payments="paginatedPayments"
        :loading="loading"
        @quitar="openQuitarModal"
        @ajustar="openAjustarModal"
      />

      <div v-if="totalItems > pageCount" class="mt-4 flex justify-end">
        <UPagination
          v-model:page="page"
          :total="totalItems"
          :items-per-page="pageCount"
          class="cursor-pointer"
          :ui="{
            item: 'cursor-pointer',
            prev: 'cursor-pointer',
            next: 'cursor-pointer',
          }"
        />
      </div>

      <PaymentsPaymentCreateModal
        v-model:open="openCreateModal"
        :clube-id="filters.clubeId ?? null"
        :plano-id="
          filters.planoId && filters.planoId !== 'TODOS'
            ? Number(filters.planoId)
            : null
        "
        @success="loadPayments"
      />

      <PaymentsPaymentFormModal
        v-model:open="openModal"
        :payment="selectedPayment"
        :mode="modalMode"
        @success="loadPayments"
      />
    </UPageBody>
  </UPage>
</template>
