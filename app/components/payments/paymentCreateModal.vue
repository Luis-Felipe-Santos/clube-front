<script setup lang="ts">
import type { SocioPlanoOption } from "~/composables/usePayments";

const props = defineProps<{
  open: boolean;
  clubeId: number | null;
  planoId: number | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  success: [];
}>();

const { criar, listarSocioPlanos } = usePayments();
const toast = useToast();

const loading = ref(false);
const loadingSocioPlanos = ref(false);

const socioPlanoOptions = ref<{ label: string; value: number }[]>([]);

const form = reactive({
  socioPlanoId: undefined as number | undefined,
  competencia: "",
  desconto: undefined as number | undefined,
  acrescimo: undefined as number | undefined,
  dataVencimento: "",
  observacao: "",
});

watch(
  () => props.open,
  async (opened) => {
    if (!opened) return;

    form.socioPlanoId = undefined;
    form.competencia = "";
    form.desconto = undefined;
    form.acrescimo = undefined;
    form.dataVencimento = "";
    form.observacao = "";

    if (!props.clubeId) {
      socioPlanoOptions.value = [];
      return;
    }

    try {
      loadingSocioPlanos.value = true;

      const response = await listarSocioPlanos(props.clubeId, props.planoId);

      socioPlanoOptions.value = response
        .sort((a: SocioPlanoOption, b: SocioPlanoOption) =>
          a.socioNome.localeCompare(b.socioNome, "pt-BR", {
            sensitivity: "base",
          }),
        )
        .map((item: SocioPlanoOption) => ({
          label: `${item.socioNome} - ${item.planoNome}`,
          value: item.id,
        }));
    } catch (error: any) {
      socioPlanoOptions.value = [];

      toast.add({
        title: "Erro ao carregar sócios",
        description:
          error?.data?.message || "Não foi possível carregar os vínculos.",
        color: "error",
      });
    } finally {
      loadingSocioPlanos.value = false;
    }
  },
);

function closeModal() {
  emit("update:open", false);
}

async function handleCreate() {
  if (!form.socioPlanoId) {
    toast.add({
      title: "Selecione um sócio",
      color: "warning",
    });
    return;
  }

  if (!form.competencia) {
    toast.add({
      title: "Informe a competência",
      color: "warning",
    });
    return;
  }

  try {
    loading.value = true;

    await criar({
      socioPlanoId: form.socioPlanoId,
      competencia: form.competencia,
      desconto: form.desconto,
      acrescimo: form.acrescimo,
      dataVencimento: form.dataVencimento || null,
      observacao: form.observacao || null,
    });

    toast.add({
      title: "Pagamento criado com sucesso",
      color: "success",
    });

    emit("success");
    closeModal();
  } catch (error: any) {
    toast.add({
      title: "Erro ao criar pagamento",
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
            <h3 class="text-lg font-semibold">Novo pagamento</h3>
            <p class="text-sm text-gray-500">
              Crie uma cobrança para um sócio.
            </p>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="Sócio / Plano">
            <USelect
              v-model="form.socioPlanoId"
              :items="socioPlanoOptions"
              :loading="loadingSocioPlanos"
              placeholder="Selecione o sócio"
              class="cursor-pointer"
            />
          </UFormField>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField label="Competência">
              <UInput v-model="form.competencia" type="month" />
            </UFormField>

            <UFormField label="Data de vencimento">
              <UInput v-model="form.dataVencimento" type="date" />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <UFormField label="Desconto">
              <UInput
                v-model="form.desconto"
                type="number"
                step="0.01"
                placeholder="0,00"
              />
            </UFormField>

            <UFormField label="Acréscimo">
              <UInput
                v-model="form.acrescimo"
                type="number"
                step="0.01"
                placeholder="0,00"
              />
            </UFormField>
          </div>

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
              icon="i-lucide-plus"
              label="Criar pagamento"
              @click="handleCreate"
              class="cursor-pointer"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
