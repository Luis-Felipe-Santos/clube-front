<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const auth = useAuthStore();

const items: NavigationMenuItem[][] = [
  [
    {
      label: "Início",
      icon: "i-lucide-house",
      to: "/app",
    },
    {
      label: "Clubes",
      icon: "i-ph:building-office-light",
      to: "/clubs",
    },
    {
      label: "Planos",
      icon: "i-material-symbols-light:receipt-outline",
      to: "/plans",
    },
    {
      label: "Sócios",
      icon: "i-lucide-users",
      to: "/members",
    },
    {
      label: "Mensalidades",
      icon: "i-lucide-credit-card",
      to: "/payments",
    },
    {
      label: "Configurações",
      icon: "i-lucide-settings",
      defaultOpen: true,
      children: [
        {
          label: "Geral",
          to: "/app/configuracoes/geral",
        },
        {
          label: "Usuários",
          to: "/app/configuracoes/usuarios",
        },
      ],
    },
  ],
];
</script>

<template>
  <UDashboardSidebar
    collapsible
    resizable
    :ui="{ footer: 'border-t border-default' }"
  >
    <template #header="{ collapsed }">
      <img src="/logo.png" alt="logo" class="h-30 w-auto object-contain" />
    </template>

    <template #default="{ collapsed }">
      <UNavigationMenu
        :collapsed="collapsed"
        :items="items[0]"
        orientation="vertical"
        :ui="{
          link: 'cursor-pointer',
        }"
      />
    </template>

    <template #footer="{ collapsed }">
      <ClientOnly>
        <UButton
          v-if="auth.user"
          :avatar="{
            src: 'https://github.com/benjamincanac.png',
            loading: 'lazy' as const,
          }"
          :label="collapsed ? undefined : auth.user.nome"
          color="neutral"
          variant="ghost"
          class="w-full"
          :block="collapsed"
        />
      </ClientOnly>
    </template>
  </UDashboardSidebar>
</template>
