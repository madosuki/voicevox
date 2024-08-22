<template>
  <Suspense><App /></Suspense>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from "vue";

const App = defineAsyncComponent(() => import("@/components/App.vue"));
</script>
