<script setup lang="ts">
import type { PagamentoLista } from "~/composables/usePayments";

defineProps<{
  payments: PagamentoLista[];
  loading: boolean;
}>();

const emit = defineEmits<{
  quitar: [payment: PagamentoLista];
  ajustar: [payment: PagamentoLista];
}>();

function formatCurrency(value?: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

function getStatusColor(status: string) {
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
}
</script>

<template>
  <UCard>
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b">
            <th class="px-4 py-3 text-left">Sócio</th>
            <th class="px-4 py-3 text-left">Plano</th>
            <th class="px-4 py-3 text-left">Competência</th>
            <th class="px-4 py-3 text-left">Valor</th>
            <th class="px-4 py-3 text-left">Vencimento</th>
            <th class="px-4 py-3 text-left">Status</th>
            <th class="px-4 py-3 text-left">Data pagamento</th>
            <th class="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="px-4 py-8 text-center text-gray-500">
              Carregando pagamentos...
            </td>
          </tr>

          <tr v-else-if="payments.length === 0">
            <td colspan="8" class="px-4 py-8 text-center text-gray-500">
              Nenhum pagamento encontrado.
            </td>
          </tr>

          <tr v-for="payment in payments" :key="payment.id" class="border-b">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <UAvatar
                  :src="payment.socioImagemUrl || undefined"
                  :alt="payment.socioNome"
                />
                <span>{{ payment.socioNome }}</span>
              </div>
            </td>

            <td class="px-4 py-3">{{ payment.planoNome }}</td>
            <td class="px-4 py-3">
              {{ formatCompetencia(payment.competencia) }}
            </td>
            <td class="px-4 py-3">{{ formatCurrency(payment.valorFinal) }}</td>
            <td class="px-4 py-3">{{ formatDate(payment.dataVencimento) }}</td>
            <td class="px-4 py-3">
              <UBadge :color="getStatusColor(payment.status)" variant="soft">
                {{ payment.status }}
              </UBadge>
            </td>
            <td class="px-4 py-3">{{ formatDate(payment.dataPagamento) }}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-2">
                <UButton
                  v-if="payment.status !== 'PAGO'"
                  size="xs"
                  icon="i-lucide-badge-check"
                  label="Quitar"
                  @click="emit('quitar', payment)"
                />

                <UButton
                  size="xs"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-pencil"
                  label="Ajustar"
                  @click="emit('ajustar', payment)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>
