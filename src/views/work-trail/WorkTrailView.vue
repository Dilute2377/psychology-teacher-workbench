<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Pencil, ShieldPlus, Trash2 } from '@lucide/vue'
import WorkTrailFormModal from '../../components/work-trail/WorkTrailFormModal.vue'
import WorkTrailDetailDrawer from '../../components/work-trail/WorkTrailDetailDrawer.vue'
import { useWorkTrailStore } from '../../stores/useWorkTrailStore'

const store = useWorkTrailStore()
const selected = computed(() => store.selectedTrail)
const categoryLabels = { parent: '家长沟通', teacher: '班主任协同', leader: '领导指令', handover: '任务交接', subbing: '代课与杂务', disclaimer: '危机免责存证' }
async function remove() { if (!selected.value || !window.confirm('确定删除该工作留痕吗？')) return; await store.deleteTrail(selected.value.id) }
onMounted(() => void store.fetchTrails())
</script>
<template><section class="flex h-full min-h-0 flex-col overflow-hidden"><div v-if="!selected" class="flex flex-1 flex-col items-center justify-center p-8 text-center"><span class="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><ShieldPlus :size="25" /></span><p class="mt-4 text-sm font-medium text-slate-600">👈 请在左侧选择一条留痕记录查看详细存证</p></div><div v-else class="flex flex-1 flex-col overflow-y-auto p-6"><div class="flex items-start justify-between border-b border-slate-200 pb-5"><div><p class="text-sm text-emerald-700">{{ selected.dateTime }}</p><h1 class="mt-1 text-xl font-semibold text-slate-800">{{ selected.title }}</h1><p class="mt-1 text-sm text-slate-500">{{ categoryLabels[selected.category] }} · {{ selected.stakeholderName }}<span v-if="selected.studentName"> · {{ selected.studentName }}</span></p></div><div class="flex gap-2"><button type="button" class="rounded-lg border border-slate-200 p-2 text-slate-500" @click="store.openForm(selected.id)"><Pencil :size="16" /></button><button type="button" class="rounded-lg border border-rose-200 p-2 text-rose-600" @click="remove"><Trash2 :size="16" /></button></div></div><p class="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">{{ selected.content }}</p></div><Transition name="toast"><div v-if="store.toast" class="fixed right-6 top-20 z-[70] rounded-xl border px-4 py-3 text-sm font-medium shadow-lg" :class="store.toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : store.toast.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-rose-200 bg-rose-50 text-rose-800'">{{ store.toast.message }}</div></Transition><WorkTrailFormModal v-if="store.isFormOpen" :editing-id="store.editingTrailId" @saved="store.fetchTrails()" /><WorkTrailDetailDrawer v-if="store.isDetailOpen && selected" :trail="selected" @close="store.closeDetail()" /></section></template>
<style scoped>.toast-enter-active,.toast-leave-active{transition:all .2s ease}.toast-enter-from,.toast-leave-to{opacity:0;transform:translateY(-8px)}</style>
