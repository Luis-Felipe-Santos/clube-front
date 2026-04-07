<script setup lang="ts">
import type { PagamentoLista } from "~/composables/usePayments";
import { formatCompetencia, formatCurrency } from "~/utils/payments";

const props = defineProps<{
  open: boolean;
  payment: PagamentoLista | null;
  mode: "quitar" | "ajustar";
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  success: [];
}>();

const { quitar, ajustar } = usePayments();
const toast = useToast();

const loading = ref(false);

const form = reactive({
  dataPagamento: "",
  valorFinal: undefined as number | undefined,
  observacao: "",
});

const isQuitar = computed(() => props.mode === "quitar");

watch(
  () => props.open,
  (opened) => {
    if (!opened || !props.payment) return;

    const today = new Date().toISOString().split("T")[0] ?? "";

    form.dataPagamento = props.payment.dataPagamento ?? today;
    form.valorFinal = props.payment.valorFinal ?? undefined;
    form.observacao = props.payment.observacao ?? "";
  },
  { immediate: true },
);

function closeModal() {
  emit("update:open", false);
}

async function handleSubmit() {
  if (!props.payment) return;

  try {
    loading.value = true;

    if (isQuitar.value) {
      await quitar(props.payment.id, {
        dataPagamento: form.dataPagamento || null,
        observacao: form.observacao || null,
      });
    } else {
      await ajustar(props.payment.id, {
        dataPagamento: form.dataPagamento || null,
        valorFinal: form.valorFinal ?? null,
        observacao: form.observacao || null,
      });
    }

    toast.add({
      title: isQuitar.value
        ? "Pagamento quitado com sucesso"
        : "Pagamento ajustado com sucesso",
      color: "success",
    });

    emit("success");
    closeModal();
  } catch (error: any) {
    toast.add({
      title: "Erro ao salvar pagamento",
      description: error?.data?.message || "Tente novamente.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #content>
      <UCard>
        <template #header>
          <div>
            <h3 class="text-lg font-semibold">
              {{ isQuitar ? "Quitar pagamento" : "Ajustar pagamento" }}
            </h3>
            <p class="text-sm text-gray-500">
              {{ payment?.socioNome }} • {{ payment?.planoNome }} •
              {{ formatCompetencia(payment?.competencia) }}
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField label="Data do pagamento">
              <UInput v-model="form.dataPagamento" type="date" />
            </UFormField>

            <UFormField :label="isQuitar ? 'Valor' : 'Valor final'">
              <UInput
                v-if="isQuitar"
                :model-value="formatCurrency(payment?.valorFinal)"
                disabled
              />

              <UInput
                v-else
                v-model="form.valorFinal"
                type="number"
                step="0.01"
                placeholder="0,00"
              />
            </UFormField>
          </div>

          <UFormField v-if="!isQuitar" label="Valor do plano">
            <UInput
              :model-value="formatCurrency(payment?.valorBase)"
              disabled
            />
          </UFormField>

          <UFormField label="Observação">
            <UTextarea v-model="form.observacao" />
          </UFormField>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              color="neutral"
              variant="soft"
              label="Cancelar"
              @click="closeModal"
              class="cursor-pointer"
            />

            <UButton
              :loading="loading"
              :label="isQuitar ? 'Quitar' : 'Salvar ajuste'"
              :icon="isQuitar ? 'i-lucide-badge-check' : 'i-lucide-pencil'"
              @click="handleSubmit"
              class="cursor-pointer"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
