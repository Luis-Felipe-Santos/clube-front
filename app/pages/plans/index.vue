<script setup lang="ts">
import PlansTable from "~/components/plans/plansTable.vue";

definePageMeta({
  layout: "app-layout",
  title: "Planos",
});
</script>
<template>
  <UPage>
    <UPageHeader description="Visualize e gerencie os planos cadastrados." />

    <UPageBody>
      <PlansTable />
    </UPageBody>
  </UPage>
</template>
