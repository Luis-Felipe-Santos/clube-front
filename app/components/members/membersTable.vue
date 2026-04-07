<script setup lang="ts">
import { h, resolveComponent } from "vue";
import MemberFormModal from "~/components/members/memberFormModal.vue";
import MemberPlanModal from "~/components/members/memberPlanModal.vue";
import DependentTable from "../dependents/dependentTable.vue";
import { maskDocument, maskPhone } from "~/utils/masks";

type Member = {
  id: number;
  nome: string;
  tipoDocumento?: "CPF" | "CNPJ";
  documento?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  imagemUrl?: string;
  imagemPreviewUrl?: string;
  status?: "ATIVO" | "INATIVO";
  clubeId?: number;
  socioPlanoId?: number;
  planoId?: number;
  planoNome?: string;
  statusPlano?: "ATIVO" | "SUSPENSO" | "CANCELADO";
  possuiPlanoAtivo?: boolean;
};

type ClubOption = {
  id: number;
  nome: string;
};

type SortField = "nome" | "planoNome" | "status" | "statusPlano";
type SortDirection = "asc" | "desc";

const UAvatar = resolveComponent("UAvatar");
const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");

const toast = useToast();
const { get, patch } = useApi();

const members = ref<Member[]>([]);
const clubs = ref<ClubOption[]>([]);
const selectedClubId = ref<number | undefined>(undefined);

const search = ref("");
const loading = ref(false);
const page = ref(1);
const pageCount = 12;

const sortBy = ref<SortField>("nome");
const sortDirection = ref<SortDirection>("asc");

const isMemberModalOpen = ref(false);
const isPlanModalOpen = ref(false);
const selectedMember = ref<Member | null>(null);

const isDependentsModalOpen = ref(false);
const selectedMemberDependents = ref<Member | null>(null);

const isImageModalOpen = ref(false);
const selectedImage = ref("");
const selectedImageName = ref("");

const clubOptions = computed(() =>
  clubs.value.map((club) => ({
    label: club.nome,
    value: club.id,
  })),
);

const sortOptions = [
  { label: "Nome (A-Z)", value: "nome-asc" },
  { label: "Nome (Z-A)", value: "nome-desc" },
  { label: "Plano (A-Z)", value: "planoNome-asc" },
  { label: "Plano (Z-A)", value: "planoNome-desc" },
  { label: "Status do sócio (A-Z)", value: "status-asc" },
  { label: "Status do sócio (Z-A)", value: "status-desc" },
  { label: "Status do plano (A-Z)", value: "statusPlano-asc" },
  { label: "Status do plano (Z-A)", value: "statusPlano-desc" },
];

const selectedSort = computed({
  get: () => `${sortBy.value}-${sortDirection.value}`,
  set: (value: string) => {
    const [field, direction] = value.split("-") as [SortField, SortDirection];
    sortBy.value = field;
    sortDirection.value = direction;
  },
});

const filteredMembers = computed(() => {
  const term = search.value.toLowerCase().trim();

  if (!term) return [...members.value];

  return members.value.filter((member) => {
    return (
      member.nome?.toLowerCase().includes(term) ||
      member.documento?.toLowerCase().includes(term) ||
      member.telefone?.toLowerCase().includes(term) ||
      member.email?.toLowerCase().includes(term) ||
      member.planoNome?.toLowerCase().includes(term)
    );
  });
});

const sortedMembers = computed(() => {
  const result = [...filteredMembers.value];

  return result.sort((a, b) => {
    const aValue = (a[sortBy.value] ?? "").toString();
    const bValue = (b[sortBy.value] ?? "").toString();

    const comparison = aValue.localeCompare(bValue, "pt-BR", {
      sensitivity: "base",
    });

    return sortDirection.value === "asc" ? comparison : -comparison;
  });
});

const paginatedMembers = computed(() => {
  const start = (page.value - 1) * pageCount;
  const end = start + pageCount;
  return sortedMembers.value.slice(start, end);
});

function getStatusColor(status?: string) {
  switch (status) {
    case "ATIVO":
      return "success";
    case "INATIVO":
      return "warning";
    default:
      return "neutral";
  }
}

function getPlanStatusColor(status?: string) {
  switch (status) {
    case "ATIVO":
      return "success";
    case "SUSPENSO":
      return "warning";
    case "CANCELADO":
      return "neutral";
    default:
      return "neutral";
  }
}

function openImagePreview(image?: string, name?: string) {
  if (!image) return;

  selectedImage.value = image;
  selectedImageName.value = name || "Imagem";
  isImageModalOpen.value = true;
}

async function fetchClubs() {
  try {
    const response = (await get<ClubOption[]>("/clubes")) || [];
    clubs.value = response;

    const firstClub = response[0];

    if (!selectedClubId.value && firstClub) {
      selectedClubId.value = firstClub.id;
    }
  } catch (error) {
    toast.add({
      title: "Erro ao carregar clubes",
      description: "Não foi possível buscar os clubes.",
      color: "error",
    });
  }
}

async function fetchMembers() {
  if (!selectedClubId.value) {
    members.value = [];
    return;
  }

  try {
    loading.value = true;

    const response = await get<Member[]>(
      `/socios?clubeId=${selectedClubId.value}`,
    );

    const membersWithImagePreview = await Promise.all(
      response.map(async (member) => {
        if (!member.imagemUrl) return member;

        try {
          const result = await get<{ signedUrl: string }>(
            `/socios/imagem/signed-url?path=${encodeURIComponent(member.imagemUrl)}`,
          );

          return {
            ...member,
            imagemPreviewUrl: result.signedUrl,
          };
        } catch (error) {
          console.error("Error generating signed URL:", error);
          return member;
        }
      }),
    );

    members.value = membersWithImagePreview;
  } catch (error) {
    toast.add({
      title: "Erro ao carregar sócios",
      description: "Não foi possível buscar os sócios.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

function openNewMemberModal() {
  selectedMember.value = null;
  isMemberModalOpen.value = true;
}

function openEditMemberModal(member: Member) {
  selectedMember.value = member;
  isMemberModalOpen.value = true;
}

function openMemberPlanModal(member: Member) {
  selectedMember.value = member;
  isPlanModalOpen.value = true;
}

function openDependentsModal(member: Member) {
  selectedMemberDependents.value = member;
  isDependentsModalOpen.value = true;
}

async function inactivateMember(member: Member) {
  const confirmed = window.confirm(
    `Tem certeza que deseja inativar o sócio "${member.nome}"? O plano ativo também será suspenso.`,
  );
  if (!confirmed) return;

  try {
    await patch(`/socios/${member.id}/inativar`);

    toast.add({
      title: "Sócio inativado",
      description: "O sócio foi inativado e o plano ativo foi suspenso.",
      color: "success",
    });

    await fetchMembers();
  } catch (error: any) {
    toast.add({
      title: "Erro ao inativar",
      description: error?.data?.message || "Não foi possível inativar o sócio.",
      color: "error",
    });
  }
}

async function reactivateMember(member: Member) {
  const confirmed = window.confirm(
    `Tem certeza que deseja reativar o sócio "${member.nome}"? O plano suspenso também será reativado.`,
  );
  if (!confirmed) return;

  try {
    await patch(`/socios/${member.id}/reativar`);

    toast.add({
      title: "Sócio reativado",
      description: "O sócio foi reativado e o plano suspenso foi reativado.",
      color: "success",
    });

    await fetchMembers();
  } catch (error: any) {
    toast.add({
      title: "Erro ao reativar",
      description: error?.data?.message || "Não foi possível reativar o sócio.",
      color: "error",
    });
  }
}

async function handleMemberCreated(member: Member) {
  selectedMember.value = member;
  isMemberModalOpen.value = false;

  await fetchMembers();

  isPlanModalOpen.value = true;
}

async function handleMemberUpdated(member: Member) {
  selectedMember.value = member;
  isMemberModalOpen.value = false;

  await fetchMembers();
}

async function handlePlanSuccess() {
  isPlanModalOpen.value = false;
  selectedMember.value = null;

  await fetchMembers();
}

const columns = [
  {
    accessorKey: "imagemPreviewUrl",
    header: "Foto",
    cell: ({ row }: any) => {
      const member = row.original;
      const image = member.imagemPreviewUrl;
      const isUrl = typeof image === "string" && image.startsWith("http");

      return h(
        "button",
        {
          type: "button",
          class:
            "cursor-zoom-in rounded-full transition duration-200 hover:scale-105 hover:opacity-90",
          onClick: () => openImagePreview(image, member.nome),
        },
        [
          h(UAvatar, {
            src: isUrl ? image : undefined,
            alt: member.nome,
            text: member.nome,
            size: "lg",
          }),
        ],
      );
    },
  },
  {
    accessorKey: "nome",
    header: "Nome",
  },
  {
    accessorKey: "documento",
    header: "Documento",
    cell: ({ row }: any) => {
      const member = row.original;

      if (!member.documento) return "N/A";

      return maskDocument(member.documento, member.tipoDocumento || "CPF");
    },
  },
  {
    accessorKey: "telefone",
    header: "Telefone",
    cell: ({ row }: any) => {
      const phone = row.original.telefone;
      return phone ? maskPhone(phone) : "N/A";
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }: any) => row.original.email || "N/A",
  },
  {
    accessorKey: "endereco",
    header: "Endereço",
    cell: ({ row }: any) => row.original.endereco || "N/A",
  },
  {
    accessorKey: "planoNome",
    header: "Plano",
    cell: ({ row }: any) => {
      const member = row.original;
      return member.planoNome || "Sem plano";
    },
  },
  {
    accessorKey: "statusPlano",
    header: "Status do plano",
    cell: ({ row }: any) => {
      const statusPlano = row.original.statusPlano;

      if (!statusPlano) return "N/A";

      return h(
        UBadge,
        {
          color: getPlanStatusColor(statusPlano),
          variant: "subtle",
        },
        () => statusPlano,
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status do sócio",
    cell: ({ row }: any) => {
      const status = row.original.status || "ATIVO";

      return h(
        UBadge,
        {
          color: getStatusColor(status),
          variant: "subtle",
        },
        () => status,
      );
    },
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }: any) => {
      const member = row.original;
      const isInactive = member.status === "INATIVO";

      return h(
        UDropdownMenu,
        {
          items: [
            [
              {
                label: "Dependentes",
                icon: "i-lucide-users",
                onSelect: () => openDependentsModal(member),
                class: "cursor-pointer",
              },
              {
                label: "Editar",
                icon: "i-lucide-pencil",
                onSelect: () => openEditMemberModal(member),
                class: "cursor-pointer",
              },
              {
                label: isInactive
                  ? "Reativar sócio e plano"
                  : "Inativar sócio e suspender plano",
                icon: isInactive
                  ? "i-material-symbols:person-add-outline"
                  : "i-material-symbols:person-off-outline",
                class: "cursor-pointer",
                onSelect: () =>
                  isInactive
                    ? reactivateMember(member)
                    : inactivateMember(member),
              },
            ],
          ],
        },
        {
          default: () =>
            h(UButton, {
              icon: "i-lucide-ellipsis-vertical",
              color: "neutral",
              variant: "ghost",
              class: "cursor-pointer",
            }),
        },
      );
    },
  },
];

onMounted(async () => {
  await fetchClubs();
});

watch(search, () => {
  page.value = 1;
});

watch(selectedClubId, () => {
  page.value = 1;
  fetchMembers();
});

watch([sortBy, sortDirection], () => {
  page.value = 1;
});
</script>

<template>
  <UCard>
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div class="w-full sm:w-64">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Buscar sócio..."
          />
        </div>

        <div class="w-full sm:w-56">
          <USelect
            v-model="selectedClubId"
            :items="clubOptions"
            value-key="value"
            option-attribute="label"
            placeholder="Selecione o clube"
            class="cursor-pointer"
          />
        </div>

        <div class="w-full sm:w-56">
          <USelect
            v-model="selectedSort"
            :items="sortOptions"
            value-key="value"
            option-attribute="label"
            placeholder="Ordenar por"
            class="cursor-pointer"
          />
        </div>
      </div>

      <div class="flex justify-end">
        <UButton
          class="cursor-pointer"
          label="Novo sócio"
          icon="i-lucide-plus"
          color="success"
          @click="openNewMemberModal"
        />
      </div>
    </div>

    <div class="mt-4">
      <UTable :data="paginatedMembers" :columns="columns" :loading="loading" />
    </div>

    <div
      v-if="!loading && paginatedMembers.length === 0"
      class="py-10 text-center text-sm text-gray-500"
    >
      Nenhum sócio encontrado.
    </div>

    <div class="mt-4 flex justify-end">
      <UPagination
        v-model:page="page"
        :items-per-page="pageCount"
        :total="sortedMembers.length"
      />
    </div>
  </UCard>

  <MemberFormModal
    v-if="selectedClubId !== undefined"
    v-model:open="isMemberModalOpen"
    :socio="selectedMember"
    :clube-id="selectedClubId"
    @created="handleMemberCreated"
    @updated="handleMemberUpdated"
  />

  <MemberPlanModal
    v-if="selectedMember"
    v-model:open="isPlanModalOpen"
    :socio="selectedMember"
    :clube-id="selectedClubId"
    @success="handlePlanSuccess"
  />

  <UModal
    v-model:open="isDependentsModalOpen"
    :title="`Dependentes de ${selectedMemberDependents?.nome || ''}`"
    fullscreen
  >
    <template #body>
      <DependentTable
        v-if="selectedMemberDependents"
        :socio-id="selectedMemberDependents.id"
        :socio-nome="selectedMemberDependents.nome"
      />
    </template>
  </UModal>

  <UModal v-model:open="isImageModalOpen" fullscreen>
    <template #content>
      <div
        class="relative flex h-screen w-full items-center justify-center bg-black/95 p-4"
        @click="isImageModalOpen = false"
      >
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          class="absolute right-4 top-4 z-10"
          @click.stop="isImageModalOpen = false"
        />

        <div
          class="flex w-full max-w-6xl flex-col items-center gap-4"
          @click.stop
        >
          <div class="text-center">
            <p class="text-lg font-semibold text-white">
              {{ selectedImageName }}
            </p>
            <p class="text-sm text-gray-400">Clique fora ou no X para fechar</p>
          </div>

          <div
            class="flex w-full items-center justify-center overflow-hidden rounded-2xl"
          >
            <img
              v-if="selectedImage"
              :src="selectedImage"
              :alt="selectedImageName"
              class="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
