<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { Pencil, Trash2 } from '@lucide/vue'
import CommunicationDetailDrawer from '../../components/communication/CommunicationDetailDrawer.vue'
import CommunicationFormModal from '../../components/communication/CommunicationFormModal.vue'
import { useCommunicationStore } from '../../stores/useCommunicationStore'
import { useTermStore } from '../../stores/useTermStore'
const store = useCommunicationStore(); const termStore = useTermStore(); const selected = computed(() => store.selectedLog)
async function load() { await store.fetchLogs() }
async function remove() { if (!selected.value || !window.confirm('确定删除该沟通记录吗？')) return; await store.deleteLog(selected.value.id) }
onMounted(load); watch(() => termStore.currentTermId, () => void load())
</script>
<template><section class="flex h-full min-h-0 flex-col overflow-hidden"><div v-if="!selected" class="flex flex-1 items-center justify-center text-sm text-slate-400">选择一条沟通记录</div><div v-else class="flex flex-1 flex-col overflow-y-auto p-6"><div class="flex items-start justify-between border-b border-slate-200 pb-5"><div><p class="text-sm text-emerald-700">{{ selected.dateTime }}</p><h1 class="mt-1 text-xl font-semibold text-slate-800">{{ selected.studentName }} · {{ selected.targetName }}</h1></div><div class="flex gap-2"><button type="button" class="rounded-lg border border-slate-200 p-2 text-slate-500" @click="store.openForm(selected.id)"><Pencil :size="16" /></button><button type="button" class="rounded-lg border border-rose-200 p-2 text-rose-600" @click="remove"><Trash2 :size="16" /></button></div></div><p class="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">{{ selected.summary }}</p><p v-if="selected.actionPlan" class="mt-5 border-l-2 border-emerald-400 pl-3 text-sm leading-7 text-slate-600">{{ selected.actionPlan }}</p><div v-if="selected.attachments.length" class="mt-6 grid gap-3 sm:grid-cols-2"><a v-for="file in selected.attachments" :key="file.id" :href="file.url" :download="file.name" class="rounded-lg border border-slate-200 p-3 text-sm text-emerald-700">📎 {{ file.name }}</a></div></div><CommunicationFormModal v-if="store.isFormOpen" :editing-id="store.editingLogId" @saved="load" /><CommunicationDetailDrawer v-if="store.isDetailOpen && selected" :log="selected" @close="store.closeDetail()" /></section></template>
