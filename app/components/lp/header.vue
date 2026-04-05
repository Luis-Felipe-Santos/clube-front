<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: "Docs",
  },
  {
    label: "Components",
  },
  {
    label: "Figma",
    to: "https://go.nuxt.com/figma-ui",
    target: "_blank",
  },
  {
    label: "Releases",
    to: "https://github.com/nuxt/ui/releases",
    target: "_blank",
  },
]);
</script>

<template>
  <UHeader>
    <template #title>
      <img src="/logo.png" alt="logo" class="h-30 w-auto object-contain" />
    </template>

    <UNavigationMenu :items="items" />

    <template #right>
      <UColorModeButton />
      <UTooltip text="Login">
        <UButton
          color="neutral"
          variant="ghost"
          to="/auth/login"
          icon="mdi:user"
          aria-label="Login"
        />
      </UTooltip>
    </template>
  </UHeader>
</template>
