<script setup lang="ts">
import MembersTable from "~/components/members/membersTable.vue";

definePageMeta({
  layout: "app-layout",
  title: "Sócios",
});
</script>
<template>
  <UPage>
    <UPageHeader description="Visualize e gerencie os sócios cadastrados." />

    <UPageBody>
      <MembersTable />
    </UPageBody>
  </UPage>
</template>
