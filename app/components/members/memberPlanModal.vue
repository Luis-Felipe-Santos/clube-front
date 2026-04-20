<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

type Socio = {
  id: number;
  nome: string;
};

type Plano = {
  id: number;
  nome: string;
};

const props = defineProps<{
  open: boolean;
  socio?: Socio | null;
  clubeId?: number;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  success: [];
}>();

const toast = useToast();
const { get, post } = useCachedApi();

const loading = ref(false);
const planosLoading = ref(false);
const submitted = ref(false);
const planos = ref<Plano[]>([]);

const state = reactive({
  planoId: undefined as number | undefined,
});

const schema = z.object({
  planoId: z.any().optional(),
});

type Schema = z.output<typeof schema>;

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit("update:open", value),
});

const planoOptions = computed(() =>
  planos.value.map((plano) => ({
    label: plano.nome,
    value: plano.id,
  })),
);

async function fetchPlanos() {
  if (!props.clubeId) {
    planos.value = [];
    return;
  }

  try {
    planosLoading.value = true;
    const response = await get<Plano[]>(`/planos?clubeId=${props.clubeId}`);
    planos.value = response;
  } catch (error) {
    toast.add({
      title: "Erro ao carregar planos",
      description: "Não foi possível buscar os planos.",
      color: "error",
    });
  } finally {
    planosLoading.value = false;
  }
}

function resetForm() {
  state.planoId = undefined;
  submitted.value = false;
}

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  if (loading.value) return;

  submitted.value = true;

  if (!props.socio?.id) return;
  if (!state.planoId) return;

  try {
    loading.value = true;

    const payload = {
      socioId: props.socio.id,
      planoId: Number(state.planoId),
    };

    await post("/socio-planos", payload);

    toast.add({
      title: "Plano vinculado",
      description: "O plano foi vinculado ao sócio com sucesso.",
      color: "success",
    });

    resetForm();
    isOpen.value = false;
    emit("success");
  } catch (error: any) {
    toast.add({
      title: "Erro ao vincular plano",
      description: error?.data?.message || "Não foi possível vincular o plano.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  async (value) => {
    if (value) {
      resetForm();
      await fetchPlanos();
    } else {
      resetForm();
    }
  },
  { immediate: true },
);
</script>

<template>
  <UModal v-model:open="isOpen" title="Vincular plano ao sócio">
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Sócio">
          <UInput :model-value="props.socio?.nome || ''" disabled />
        </UFormField>

        <UFormField
          label="Plano"
          name="planoId"
          :error="
            submitted && !state.planoId ? 'Selecione um plano' : undefined
          "
        >
          <USelect
            v-model="state.planoId"
            :items="planoOptions"
            value-key="value"
            option-attribute="label"
            placeholder="Selecione um plano"
            :loading="planosLoading"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            color="neutral"
            variant="soft"
            label="Cancelar"
            @click="isOpen = false"
          />

          <UButton
            type="submit"
            label="Vincular"
            icon="i-lucide-link"
            :loading="loading"
            :disabled="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
