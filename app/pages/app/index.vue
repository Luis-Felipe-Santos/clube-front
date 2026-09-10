<script setup lang="ts">
import type { PagamentoLista } from "~/composables/usePayments";

definePageMeta({
  layout: "app-layout",
  middleware: "auth",
});

const { get } = useCachedApi();
const toast = useToast();

const loading = ref(true);
const totalClubes = ref(0);
const totalSocios = ref(0);
const totalPagamentos = ref(0);
const totalReceita = ref(0);
const pagamentosRecentes = ref<PagamentoLista[]>([]);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const getStatusColor = (status?: string) => {
  switch (status) {
    case "PAGO":
      return "success";
    case "PENDENTE":
      return "warning";
    case "ATRASADO":
      return "error";
    default:
      return "neutral";
  }
};

const summaryCards = computed(() => [
  {
    title: "Clubes",
    value: totalClubes.value,
    description: "cadastros ativos",
    icon: "i-lucide-building2",
    color: "primary",
  },
  {
    title: "Sócios",
    value: totalSocios.value,
    description: "no sistema",
    icon: "i-lucide-users",
    color: "success",
  },
  {
    title: "Pagamentos",
    value: totalPagamentos.value,
    description: "registros recentes",
    icon: "i-lucide-credit-card",
    color: "warning",
  },
  {
    title: "Receita",
    value: formatCurrency(totalReceita.value),
    description: "acumulada",
    icon: "i-lucide-wallet",
    color: "info",
  },
]);

async function loadDashboardData() {
  try {
    loading.value = true;

    const clubes = await get<any[]>("/clubes").catch(() => []);
    const clubesAtivos = (clubes ?? []).filter(
      (clube) => clube?.status === "ATIVO",
    );
    const clubIds = clubesAtivos.map((clube) => clube.id);

    totalClubes.value = clubesAtivos.length;

    if (!clubIds.length) {
      totalSocios.value = 0;
      totalPagamentos.value = 0;
      totalReceita.value = 0;
      pagamentosRecentes.value = [];
      return;
    }

    const [sociosList, pagamentosList] = await Promise.all([
      Promise.all(
        clubIds.map(async (clubeId) =>
          get<any[]>(`/socios?clubeId=${clubeId}`).catch(() => []),
        ),
      ),
      Promise.all(
        clubIds.map(async (clubeId) =>
          get<PagamentoLista[]>(`/pagamentos?clubeId=${clubeId}`).catch(
            () => [],
          ),
        ),
      ),
    ]);

    const socios = sociosList.flat();
    const pagamentos = pagamentosList.flat();

    totalSocios.value = socios.filter(
      (socio) => socio?.status !== "INATIVO",
    ).length;
    totalPagamentos.value = pagamentos.length;
    totalReceita.value = pagamentos.reduce(
      (soma, pagamento) => soma + Number(pagamento.valorFinal || 0),
      0,
    );

    pagamentosRecentes.value = [...pagamentos]
      .sort((a, b) => {
        const dateA = a.dataPagamento || a.dataVencimento || "";
        const dateB = b.dataPagamento || b.dataVencimento || "";
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 5);
  } catch (error: any) {
    toast.add({
      title: "Erro ao carregar dashboard",
      description:
        error?.data?.message || "Não foi possível carregar os dados do painel.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadDashboardData();
});
</script>

<template>
  <UPage>
    <UPageHeader
      title="Resumo da operação"
      description="Acompanhe o estado geral de clubes, sócios e mensalidades."
    />

    <UPageBody class="space-y-6">
      <div v-if="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <UCard v-for="item in 4" :key="item" class="animate-pulse">
          <div class="flex items-center justify-between">
            <div class="space-y-2">
              <div class="h-3 w-20 rounded bg-muted/40" />
              <div class="h-8 w-24 rounded bg-muted/40" />
            </div>
            <div class="h-10 w-10 rounded-lg bg-muted/40" />
          </div>
        </UCard>
      </div>

      <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <UCard
          v-for="card in summaryCards"
          :key="card.title"
          class="border border-default/60"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm text-muted">{{ card.title }}</p>
              <p class="mt-3 text-2xl font-semibold text-highlighted">
                {{ card.value }}
              </p>
              <p class="mt-1 text-xs text-muted">{{ card.description }}</p>
            </div>

            <div
              class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
            >
              <UIcon :name="card.icon" class="h-5 w-5" />
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <h3 class="text-base font-semibold text-highlighted">Ações rápidas</h3>

        <div class="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <UButton
            to="/clubs"
            color="neutral"
            variant="soft"
            class="w-full justify-start"
            icon="i-lucide-building2"
          >
            Ver clubes
          </UButton>
          <UButton
            to="/members"
            color="neutral"
            variant="soft"
            class="w-full justify-start"
            icon="i-lucide-users"
          >
            Gerenciar sócios
          </UButton>
          <UButton
            to="/payments"
            color="neutral"
            variant="soft"
            class="w-full justify-start"
            icon="i-lucide-credit-card"
          >
            Consultar pagamentos
          </UButton>
          <UButton
            to="/payments/planilha"
            color="primary"
            class="w-full justify-start"
            icon="i-lucide-file-spreadsheet"
          >
            Abrir planilha
          </UButton>
        </div>
      </UCard>

      <UCard>
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-highlighted">
              Últimos pagamentos
            </h3>
            <p class="text-sm text-muted">Movimentações recentes do sistema</p>
          </div>
          <UButton to="/payments" color="neutral" variant="ghost" size="sm">
            Ver todos
          </UButton>
        </div>

        <div v-if="pagamentosRecentes.length" class="space-y-3">
          <div
            v-for="pagamento in pagamentosRecentes"
            :key="pagamento.id"
            class="flex items-center justify-between gap-4 rounded-xl border border-default/60 px-3 py-3"
          >
            <div>
              <p class="font-medium text-highlighted">
                {{ pagamento.socioNome }}
              </p>
              <p class="text-xs text-muted">
                {{ pagamento.planoNome }} • {{ pagamento.competencia }}
              </p>
            </div>

            <div class="text-right">
              <p class="font-semibold text-highlighted">
                {{ formatCurrency(pagamento.valorFinal) }}
              </p>
              <UBadge
                :color="getStatusColor(pagamento.status)"
                variant="soft"
                size="sm"
              >
                {{ pagamento.status }}
              </UBadge>
            </div>
          </div>
        </div>

        <div
          v-else
          class="rounded-xl border border-dashed border-default/70 p-6 text-center text-sm text-muted"
        >
          Nenhum pagamento recente encontrado.
        </div>
      </UCard>
    </UPageBody>
  </UPage>
</template>
