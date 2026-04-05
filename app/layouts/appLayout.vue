<script setup lang="ts">
const route = useRoute();

const pageTitle = computed(() => {
  return (route.meta.title as string) || "Início";
});
</script>
<template>
  <UDashboardGroup>
    <AppSidebar />
    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar :title="pageTitle">
          <template #right>
            <UTooltip text="Sair">
              <UButton
                color="neutral"
                variant="ghost"
                to="/"
                icon="material-symbols:logout"
                aria-label="Sair"
              />
            </UTooltip>
          </template>
        </UDashboardNavbar>
      </template>
      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
