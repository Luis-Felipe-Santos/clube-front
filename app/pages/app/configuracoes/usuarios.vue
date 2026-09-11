<script setup lang="ts">
import { h, resolveComponent } from "vue";
import * as z from "zod";
import type { FormSubmitEvent, FormErrorEvent } from "@nuxt/ui";
import { onlyNumbers } from "~/utils/masks";

definePageMeta({
  layout: "app-layout",
  title: "Usuários",
  middleware: "auth",
});

const UBadge = resolveComponent("UBadge");

type UserRecord = {
  id: number;
  nome?: string;
  email?: string;
  cpf?: string;
  status?: string;
  role?: string;
  roles?: string[];
  imagemUrl?: string | null;
  clubeId?: number | null;
  criadoPor?: { nome?: string } | null;
  criadoPorNome?: string | null;
  createdBy?: { nome?: string } | null;
  createdByName?: string | null;
};

const defaultClubId = computed(() => {
  if (auth.user?.clubeId) {
    return Number(auth.user.clubeId);
  }

  return selectedClubId.value ?? clubs.value[0]?.id;
});

type ClubOption = {
  id: number;
  nome: string;
  status?: string;
};

const toast = useToast();
const auth = useAuthStore();
const { get, post } = useCachedApi();

const loading = ref(false);
const creating = ref(false);
const search = ref("");
const openModal = ref(false);
const users = ref<UserRecord[]>([]);
const clubs = ref<ClubOption[]>([]);
const selectedClubId = ref<number | undefined>(undefined);
const { ensureActiveClubSelected } = useActiveClubSelection(
  selectedClubId,
  clubs,
);

const roleOptions = [
  { label: "Admin", value: "ADMIN" },
  { label: "Funcionário", value: "FUNCIONARIO" },
];

const state = reactive({
  nome: "",
  cpf: "",
  email: "",
  senha: "",
  confirmSenha: "",
  role: "FUNCIONARIO" as string,
  clubeId: undefined as number | undefined,
});

const schema = z.object({
  nome: z.string().min(3, "Informe o nome completo"),
  cpf: z.string().min(11, "Informe um CPF válido"),
  email: z.string().email("Informe um e-mail válido"),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmSenha: z.string().min(6, "Confirme a senha"),
  role: z.string().min(1, "Selecione a função"),
  clubeId: z.number().optional(),
}).refine((data) => data.senha === data.confirmSenha, {
  path: ["confirmSenha"],
  message: "As senhas precisam ser iguais",
});

const canManageUsers = computed(() => {
  const roles = auth.user?.roles ?? [];

  const normalized = [
    ...(roles || []),
    auth.user?.role,
  ]
    .filter(Boolean)
    .map((role) => String(role).toUpperCase());

  return normalized.includes("ADMIN") || normalized.includes("ROLE_ADMIN");
});

const clubOptions = computed(() =>
  clubs.value.map((club) => ({
    label: club.nome,
    value: club.id,
  })),
);

const filteredUsers = computed(() => {
  const term = search.value.toLowerCase().trim();

  const clubFilteredUsers = users.value.filter((user) => {
    if (!selectedClubId.value) return false;

    const userClubId = Number(user.clubeId ?? "");

    if (!user.clubeId || Number.isNaN(userClubId)) {
      return false;
    }

    return userClubId === Number(selectedClubId.value);
  });

  if (!term) return clubFilteredUsers;

  return clubFilteredUsers.filter((user) => {
    const nome = user.nome?.toLowerCase() ?? "";
    const email = user.email?.toLowerCase() ?? "";
    const role = formatRole(user).toLowerCase();

    return (
      nome.includes(term) ||
      email.includes(term) ||
      role.includes(term)
    );
  });
});

function formatRole(user: UserRecord) {
  const roles = user.roles ?? [];

  if (roles.length) {
    return roles
      .map((role) => roleLabel(role))
      .join(", ");
  }

  if (user.role) {
    return roleLabel(user.role);
  }

  return "Sem função";
}

function roleLabel(role?: string) {
  const normalized = String(role || "").toUpperCase();

  if (normalized.includes("ADMIN")) return "Admin";
  if (normalized.includes("FUNCIONARIO")) return "Funcionário";
  if (normalized.includes("EMPLOYEE")) return "Funcionário";
  if (normalized.includes("USER")) return "Usuário";

  return role || "Sem função";
}

function getStatusColor(status?: string) {
  switch (String(status || "").toUpperCase()) {
    case "ATIVO":
      return "success";
    case "INATIVO":
      return "warning";
    case "BLOQUEADO":
      return "error";
    default:
      return "neutral";
  }
}

function getCreatedByName(user: UserRecord) {
  return (
    user.criadoPor?.nome ||
    user.createdBy?.nome ||
    user.criadoPorNome ||
    user.createdByName ||
    "Sistema"
  );
}

function resetForm() {
  state.nome = "";
  state.cpf = "";
  state.email = "";
  state.senha = "";
  state.confirmSenha = "";
  state.role = "FUNCIONARIO";
  state.clubeId = defaultClubId.value ?? selectedClubId.value;
}

function getCurrentUserClubId() {
  return Number(auth.user?.clubeId ?? selectedClubId.value ?? defaultClubId.value ?? 0);
}

function openCreateModal() {
  resetForm();
  openModal.value = true;
}

async function fetchClubs() {
  try {
    const response = (await get<ClubOption[]>("/clubes")) || [];
    clubs.value = response;

    if (auth.user?.clubeId) {
      selectedClubId.value = Number(auth.user.clubeId);
    } else {
      ensureActiveClubSelected();
    }

    state.clubeId = defaultClubId.value ?? selectedClubId.value;
  } catch (error: any) {
    toast.add({
      title: "Erro ao carregar clubes",
      description: error?.data?.message || "Não foi possível buscar os clubes.",
      color: "error",
    });
  }
}

async function fetchUsers() {
  if (!canManageUsers.value) return;

  try {
    loading.value = true;
    const response = await get<UserRecord[]>("/usuarios");
    users.value = response || [];
  } catch (error: any) {
    toast.add({
      title: "Erro ao carregar usuários",
      description: error?.data?.message || "Não foi possível buscar os usuários.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

async function onSubmit(event: FormSubmitEvent<any>) {
  try {
    creating.value = true;

    const payload = {
      nome: event.data.nome.trim(),
      cpf: onlyNumbers(event.data.cpf),
      email: event.data.email.trim(),
      senha: event.data.senha,
      roleUsuario: event.data.role,
      role: event.data.role,
      clubeId: getCurrentUserClubId(),
    };

    await post("/usuarios", payload);

    toast.add({
      title: "Usuário cadastrado",
      description: "O usuário foi criado com sucesso.",
      color: "success",
    });

    openModal.value = false;
    resetForm();
    await fetchUsers();
  } catch (error: any) {
    toast.add({
      title: "Erro ao cadastrar usuário",
      description: error?.data?.message || "Não foi possível salvar o usuário.",
      color: "error",
    });
  } finally {
    creating.value = false;
  }
}

function onError(event: FormErrorEvent) {
  console.log("Erros do formulário:", event.errors);
}

watch(
  canManageUsers,
  async (value) => {
    if (!value) return;

    await fetchClubs();
    await fetchUsers();
  },
  { immediate: true },
);

watch(selectedClubId, async () => {
  if (!canManageUsers.value) return;
  await fetchUsers();
});

onMounted(async () => {
  if (!auth.user) {
    await auth.fetchUser();
  }

  if (canManageUsers.value) {
    await fetchClubs();
    await fetchUsers();
  }
});
</script>

<template>
  <UPage>
    <UPageHeader
      title="Usuários"
      description="Gerencie usuários do sistema e suas permissões."
    />

    <UPageBody>
      <UCard>
        <div class="space-y-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
              <div class="w-full max-w-sm">
                <UInput
                  v-model="search"
                  icon="i-lucide-search"
                  placeholder="Buscar usuário..."
                />
              </div>

              <div class="w-full max-w-xs">
                <USelect
                  :model-value="selectedClubId"
                  :items="clubOptions"
                  value-key="value"
                  option-attribute="label"
                  placeholder="Selecione o clube"
                  @update:model-value="selectedClubId = Number($event)"
                />
              </div>
            </div>

            <UButton
              v-if="canManageUsers"
              label="Novo usuário"
              icon="i-lucide-plus"
              color="success"
              @click="openCreateModal"
              class="cursor-pointer"
            />
          </div>

          <template v-if="!canManageUsers">
            <div class="flex min-h-56 items-center justify-center text-center text-sm text-red-500">
              Você não tem permissão para acessar esta área.
            </div>
          </template>

          <template v-else>
            <div v-if="!selectedClubId" class="flex min-h-40 items-center justify-center text-center text-sm text-slate-500">
              Selecione um clube para visualizar os usuários vinculados.
            </div>

            <UTable v-else :data="filteredUsers" :loading="loading" :columns="[
              {
                accessorKey: 'nome',
                header: 'Usuário',
                cell: ({ row }: any) => h('div', { class: 'flex items-center gap-3' }, [
                  h('div', { class: 'flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200' }, row.original.nome?.charAt(0)?.toUpperCase() || 'U'),
                  h('div', { class: 'min-w-0' }, [
                    h('p', { class: 'truncate font-medium text-sm text-slate-900 dark:text-slate-100' }, row.original.nome || 'Sem nome'),
                    h('p', { class: 'truncate text-xs text-slate-500 dark:text-slate-400' }, row.original.email || 'Sem e-mail'),
                  ]),
                ]),
              },
              {
                accessorKey: 'role',
                header: 'Função',
                cell: ({ row }: any) => h(UBadge, { color: row.original.role?.toUpperCase()?.includes('ADMIN') ? 'primary' : 'neutral', variant: 'subtle' }, () => formatRole(row.original)),
              },
              {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }: any) => h(UBadge, { color: getStatusColor(row.original.status), variant: 'subtle' }, () => row.original.status || 'ATIVO'),
              },
              {
                accessorKey: 'criadoPor',
                header: 'Cadastrado por',
                cell: ({ row }: any) => h('span', { class: 'text-sm text-slate-600 dark:text-slate-300' }, getCreatedByName(row.original)),
              },
            ]" />
          </template>
        </div>
      </UCard>
    </UPageBody>

    <UModal v-model:open="openModal" title="Novo usuário">
      <template #body>
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
          @error="onError"
        >
          <UFormField label="Nome" name="nome">
            <UInput v-model="state.nome" placeholder="Nome completo" />
          </UFormField>

          <UFormField label="CPF" name="cpf">
            <UInput
              :model-value="state.cpf"
              placeholder="00000000000"
              @update:model-value="state.cpf = onlyNumbers($event)"
            />
          </UFormField>

          <UFormField label="E-mail" name="email">
            <UInput v-model="state.email" type="email" placeholder="email@exemplo.com" />
          </UFormField>

          <UFormField label="Senha" name="senha">
            <UInput v-model="state.senha" type="password" placeholder="Mínimo 6 caracteres" />
          </UFormField>

          <UFormField label="Confirmar senha" name="confirmSenha">
            <UInput v-model="state.confirmSenha" type="password" placeholder="Repita a senha" />
          </UFormField>

          <UFormField label="Função" name="role">
            <USelect
              v-model="state.role"
              :items="roleOptions"
              value-key="value"
              option-attribute="label"
              placeholder="Selecione a função"
            />
          </UFormField>

          <div class="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
            Vinculado ao clube: <span class="font-semibold">{{ clubs.find((club) => club.id === getCurrentUserClubId())?.nome || 'Selecionando clube atual' }}</span>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              label="Cancelar"
              color="neutral"
              variant="ghost"
              @click="() => { openModal = false; }"
            />
            <UButton label="Salvar" :loading="creating" type="submit" class="cursor-pointer" />
          </div>
        </UForm>
      </template>
    </UModal>
  </UPage>
</template>
