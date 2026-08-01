<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { FileUp, UsersRound } from '@lucide/vue'
import { useCensusStore } from '../../stores/useCensusStore'
import { useTermStore } from '../../stores/useTermStore'
import CensusImportModal from './CensusImportModal.vue'

const censusStore = useCensusStore()
const termStore = useTermStore()
const importing = ref(false)
async function load() { await censusStore.fetchBatches(); await censusStore.fetchResults() }
async function select(id: string) { await censusStore.selectBatch(id) }
watch(() => termStore.currentTermId, () => void load())
onMounted(load)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col"><header class="shrink-0 border-b border-stone-100 p-4"><div class="flex items-center justify-between gap-2"><span class="text-sm font-semibold text-stone-800">普查批次</span><button type="button" class="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800" @click="importing = true"><FileUp :size="15" />导入新普查</button></div></header><div class="min-h-0 flex-1 overflow-y-auto p-3"><p v-if="censusStore.censusBatches.length === 0" class="p-5 text-center text-sm text-stone-400">当前学期暂无普查批次。</p><button v-for="batch in censusStore.censusBatches" v-else :key="batch.id" type="button" class="mb-2 w-full rounded-xl border p-3 text-left transition hover:border-teal-300 hover:bg-teal-50" :class="censusStore.selectedBatchId === batch.id ? 'border-teal-400 bg-teal-50 shadow-sm' : 'border-stone-200 bg-white'" @click="select(batch.id)"><div class="flex items-start justify-between gap-2"><div><p class="text-sm font-semibold text-stone-800">{{ batch.title }}</p><p class="mt-1 text-xs text-stone-500">{{ batch.scaleName }}</p></div><time class="text-xs text-stone-400">{{ batch.date }}</time></div><div class="mt-3 flex items-center gap-2 text-xs"><span class="inline-flex items-center gap-1 text-stone-500"><UsersRound :size="13" />{{ batch.totalCount }} 人</span><span class="rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700">预警 {{ batch.flaggedCount }} 人</span></div></button></div><CensusImportModal v-if="importing" @close="importing = false" @imported="load" /></div>
</template>
