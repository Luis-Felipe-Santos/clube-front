<script setup lang="ts">
import PaymentsTable from "~/components/payments/paymentsTable.vue";
import type {
  PagamentoLista,
  StatusPagamento,
} from "~/composables/usePayments";

definePageMeta({
  layout: "app-layout",
});

const { listar } = usePayments();
const { get } = useApi();
const toast = useToast();

type SelectOption = {
  label: string;
  value: number | string;
};

type ClubeOptionResponse = {
  id: number;
  nome: string;
};

type PlanoOptionResponse = {
  id: number;
  nome: string;
};

const loading = ref(false);
const loadingClubs = ref(false);
const loadingPlans = ref(false);

const payments = ref<PagamentoLista[]>([]);
const clubOptions = ref<SelectOption[]>([]);
const planOptions = ref<SelectOption[]>([]);

const filters = reactive({
  clubeId: undefined as number | undefined,
  planoId: undefined as number | string | undefined,
  competencia: "" as string,
  status: "TODOS" as "TODOS" | StatusPagamento,
  busca: "",
});

const openModal = ref(false);
const modalMode = ref<"quitar" | "ajustar">("quitar");
const selectedPayment = ref<PagamentoLista | null>(null);

const openCreateModal = ref(false);

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

    clubOptions.value = response.map((club) => ({
      label: club.nome,
      value: club.id,
    }));
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
      competencia: filters.competencia || null,
      status: filters.status === "TODOS" ? null : filters.status,
      busca: filters.busca || null,
    });
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
            />
          </UFormField>

          <UFormField label="Plano">
            <USelect
              v-model="filters.planoId"
              :items="planOptions"
              :loading="loadingPlans"
              placeholder="Todos os planos"
              :disabled="!filters.clubeId"
            />
          </UFormField>

          <UFormField label="Competência">
            <UInput v-model="filters.competencia" placeholder="2026-03" />
          </UFormField>

          <UFormField label="Status">
            <USelect
              v-model="filters.status"
              :items="statusOptions"
              placeholder="Todos os status"
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
          />

          <UButton
            icon="i-lucide-search"
            label="Buscar pagamentos"
            @click="loadPayments"
          />
        </div>
      </UCard>

      <PaymentsTable
        :payments="payments"
        :loading="loading"
        @quitar="openQuitarModal"
        @ajustar="openAjustarModal"
      />

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
