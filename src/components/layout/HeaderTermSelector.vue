<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Check, ChevronDown, Settings2 } from '@lucide/vue'
import { useTermStore } from '../../stores/useTermStore'
import TermManagerModal from '../system/TermManagerModal.vue'
const open = ref(false)
const managing = ref(false)
const termStore = useTermStore()
async function select(id: string) { await termStore.setCurrentTerm(id); open.value = false }
onMounted(() => void termStore.fetchTerms())
</script>
<template>
  <div class="relative">
    <button class="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100" type="button" @click="open = !open">
      <span class="max-w-[16rem] truncate whitespace-nowrap">{{ termStore.currentTerm?.name ?? '正在载入学期…' }}</span><ChevronDown :size="15" class="shrink-0" />
    </button>
    <div v-if="open" class="absolute left-0 z-40 mt-2 w-72 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl">
      <button v-for="term in termStore.allTerms" :key="term.id" class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-stone-50" type="button" @click="select(term.id)"><span class="size-2 shrink-0 rounded-full" :class="term.id === termStore.currentTermId ? 'bg-emerald-500' : 'bg-stone-200'" /><span class="min-w-0 flex-1 truncate whitespace-nowrap">{{ term.name }}</span><Check v-if="term.id === termStore.currentTermId" :size="16" class="shrink-0 text-teal-700" /></button>
      <div class="mt-1 border-t border-stone-100 pt-1"><button class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-teal-700 hover:bg-teal-50" type="button" @click="managing = true; open = false"><Settings2 :size="16" />管理与新增学期</button></div>
    </div>
  </div>
  <TermManagerModal v-if="managing" @close="managing = false" />
</template>
