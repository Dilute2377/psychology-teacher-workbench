<script setup lang="ts">
import { ref } from 'vue'
import { Check, ChevronDown } from '@lucide/vue'
import { useTermStore } from '../../stores/term'
const open = ref(false)
const termStore = useTermStore()
function select(id: string) { termStore.selectTerm(id); open.value = false }
</script>
<template>
  <div class="relative"><button class="flex min-w-0 items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100" type="button" @click="open = !open"><span class="truncate">{{ termStore.currentTerm.name }}</span><ChevronDown :size="15" /></button><div v-if="open" class="absolute left-0 z-40 mt-2 w-64 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl"><button v-for="term in termStore.terms" :key="term.id" class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-stone-50" type="button" @click="select(term.id)"><span class="size-2 rounded-full" :class="term.id === termStore.currentTermId ? 'bg-emerald-500' : 'bg-stone-200'" /><span class="flex-1">{{ term.name }}</span><Check v-if="term.id === termStore.currentTermId" :size="16" class="text-teal-700" /></button></div></div>
</template>
