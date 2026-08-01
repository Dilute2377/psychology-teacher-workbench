<script setup lang="ts">
defineProps<{ title: string; description: string }>()
</script>

<template>
  <section class="flex h-full flex-col items-center justify-center px-8 text-center">
    <div class="mb-5 flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-xl text-teal-700">✦</div>
    <h1 class="text-xl font-semibold text-stone-800">{{ title }}</h1>
    <p class="mt-2 max-w-sm text-sm leading-6 text-stone-500">{{ description }}</p>
    <span class="mt-5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-500">阶段一 · 基础框架已就绪</span>
  </section>
</template>
