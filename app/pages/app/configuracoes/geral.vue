<script setup lang="ts">
definePageMeta({
  layout: "app-layout",
  middleware: "auth",
});

const toast = useToast();
const auth = useAuthStore();
const { patch, put } = useCachedApi();

const loading = ref(false);
const saving = ref(false);
const selectedFile = ref<File | null>(null);
const imagePreview = ref<string>("");

const form = reactive({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  imageUrl: "",
});

const roleLabel = computed(() => {
  const roles = auth.user?.roles ?? [];

  if (!roles.length && auth.user?.role) {
    return auth.user.role;
  }

  return roles.join(", ") || "Nenhuma permissão definida";
});

const avatarSrc = computed(() => {
  return imagePreview.value || undefined;
});

watch(
  () => auth.user,
  (user) => {
    if (!user) return;

    form.name = user.nome || "";
    form.email = user.email || "";
    form.imageUrl = user.imagemUrl || "";
    imagePreview.value = user.imagemUrl || "";
  },
  { immediate: true },
);

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  selectedFile.value = file;
  imagePreview.value = URL.createObjectURL(file);
}

function handleSelectedImagePreview() {
  if (!selectedFile.value) {
    return form.imageUrl || null;
  }

  return imagePreview.value || null;
}

async function saveProfile() {
  if (!auth.user) {
    toast.add({
      title: "Sessão inválida",
      description: "Faça login novamente para continuar.",
      color: "error",
    });
    return;
  }

  if (form.password && form.password !== form.confirmPassword) {
    toast.add({
      title: "Senhas diferentes",
      description: "A senha e a confirmação precisam ser iguais.",
      color: "error",
    });
    return;
  }

  try {
    saving.value = true;

    const userId = auth.user.id;

    if (!userId) {
      toast.add({
        title: "Sessão inválida",
        description: "Não foi possível identificar o usuário logado.",
        color: "error",
      });
      return;
    }

    const imageValue = handleSelectedImagePreview();

    const payload: Record<string, string> = {
      nome: form.name,
      email: form.email,
    };

    if (form.imageUrl || imageValue) {
      payload.imagemUrl = form.imageUrl || imageValue || "";
    }

    if (selectedFile.value) {
      toast.add({
        title: "Upload de foto pendente",
        description: "O backend ainda não expôs o endpoint de upload da imagem. A foto local foi selecionada apenas como preview para quando o endpoint for habilitado.",
        color: "warning",
      });
    }

    const response = await put<
      {
        nome?: string;
        email?: string;
        imagemUrl?: string | null;
      },
      Record<string, string>
    >(`/usuarios/${userId}`, payload);

    if (form.password) {
      await patch(`/usuarios/${userId}/senha`, {
        senha: form.password,
      });
    }

    auth.user = {
      ...(auth.user ?? {}),
      ...response,
      ...(form.imageUrl ? { imagemUrl: form.imageUrl } : {}),
    };

    selectedFile.value = null;
    form.password = "";
    form.confirmPassword = "";

    toast.add({
      title: "Perfil atualizado",
      description: "Suas informações foram salvas com sucesso.",
      color: "success",
    });
  } catch (error: any) {
    toast.add({
      title: "Erro ao atualizar perfil",
      description: error?.data?.message || "Não foi possível salvar suas informações.",
      color: "error",
    });
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  if (!auth.user) {
    loading.value = true;

    try {
      await auth.fetchUser();
    } catch (error: any) {
      toast.add({
        title: "Erro ao carregar perfil",
        description: error?.data?.message || "Não foi possível carregar os dados do usuário.",
        color: "error",
      });
    } finally {
      loading.value = false;
    }
  }
});
</script>

<template>
  <UPage>
    <UPageHeader
      title="Configurações gerais"
      description="Visualize e edite os dados do seu perfil."
    />

    <UPageBody>
      <UCard>
        <template v-if="loading">
          <div class="flex items-center justify-center py-12 text-sm text-gray-500">
            Carregando perfil...
          </div>
        </template>

        <template v-else>
          <div class="grid gap-6 lg:grid-cols-[240px_1fr]">
            <div class="flex flex-col items-center rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-slate-700 dark:bg-slate-800/60">
              <div class="relative">
                <UAvatar
                  size="xl"
                  :src="avatarSrc"
                  :alt="form.name || 'Usuário'"
                  :ui="{
                    root: 'ring-2 ring-primary-200 dark:ring-primary-800',
                  }"
                />

                <label class="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary-500 text-white shadow-md transition hover:bg-primary-600">
                  <input type="file" accept="image/*" class="hidden" @change="handleFileChange" />
                  <UIcon name="i-heroicons-camera" class="h-4 w-4" />
                </label>
              </div>

              <div class="mt-4 text-center">
                <p class="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {{ form.name || "Usuário" }}
                </p>
                <p class="text-sm text-gray-500 dark:text-slate-400">
                  {{ roleLabel }}
                </p>
                <p class="mt-2 text-xs text-gray-500 dark:text-slate-400">
                  A foto será sincronizada quando o backend habilitar o upload.
                </p>
              </div>
            </div>

            <div class="space-y-5">
              <div class="grid gap-4 md:grid-cols-2">
                <UFormField label="Nome">
                  <UInput v-model="form.name" placeholder="Seu nome completo" />
                </UFormField>

                <UFormField label="Email">
                  <UInput v-model="form.email" placeholder="seu@email.com" type="email" />
                </UFormField>

              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <UFormField label="Nova senha">
                  <UInput
                    v-model="form.password"
                    type="password"
                    placeholder="Deixe em branco para manter"
                  />
                </UFormField>

                <UFormField label="Confirmar senha">
                  <UInput
                    v-model="form.confirmPassword"
                    type="password"
                    placeholder="Repita a nova senha"
                  />
                </UFormField>
              </div>

              <div class="flex justify-end pt-2">
                <UButton
                  label="Salvar alterações"
                  :loading="saving"
                  @click="saveProfile"
                  class="cursor-pointer"
                />
              </div>
            </div>
          </div>
        </template>
      </UCard>
    </UPageBody>
  </UPage>
</template>
