<script setup lang="ts">
import ClubsTable from "~/components/clubs/clubsTable.vue";

definePageMeta({
  layout: "app-layout",
  title: "Clubes",
});
</script>

<template>
  <UPage>
    <UPageHeader description="Visualize e gerencie os clubes cadastrados." />

    <UPageBody>
      <ClubsTable />
    </UPageBody>
  </UPage>
</template>
