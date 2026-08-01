import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import { useTermStore } from './useTermStore'
import { useWorkbenchStore } from './workbench'
import type { CommunicationLog } from '../types/schema'

export type CommunicationDraft = Omit<CommunicationLog, 'id' | 'createdAt'>

export const useCommunicationStore = defineStore('communications', () => {
  const logs = ref<CommunicationLog[]>([])
  const selectedLogId = ref<string | null>(null)
  const isDetailOpen = ref(false)
  const isFormOpen = ref(false)
  const editingLogId = ref<string | null>(null)
  const termStore = useTermStore(); const workbench = useWorkbenchStore()
  const selectedLog = computed(() => logs.value.find((item) => item.id === selectedLogId.value))
  async function fetchLogs(filters: { targetType?: CommunicationLog['targetType'] | ''; keyword?: string; date?: string; studentId?: string; allTerms?: boolean } = {}) {
    const keyword = filters.keyword?.trim().toLowerCase() ?? ''
    const rows = await db.communicationLogs.toArray()
    logs.value = rows.filter((item) => (!filters.allTerms && termStore.currentTermId ? item.termId === termStore.currentTermId : true) && (!filters.targetType || item.targetType === filters.targetType) && (!filters.date || item.dateTime.startsWith(filters.date)) && (!filters.studentId || item.studentId === filters.studentId) && (!keyword || [item.studentName, item.targetName, item.summary].join(' ').toLowerCase().includes(keyword))).sort((a, b) => b.dateTime.localeCompare(a.dateTime))
    if (selectedLogId.value && !logs.value.some((item) => item.id === selectedLogId.value)) selectedLogId.value = null
  }
  async function addLog(draft: CommunicationDraft) { const log: CommunicationLog = { ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() }; await db.communicationLogs.add(log); await fetchLogs(); selectedLogId.value = log.id; workbench.notifyStudentsChanged(); return log }
  async function updateLog(id: string, draft: Partial<CommunicationDraft>) { await db.communicationLogs.update(id, draft); await fetchLogs(); workbench.notifyStudentsChanged(); return db.communicationLogs.get(id) }
  async function deleteLog(id: string) { await db.communicationLogs.delete(id); if (selectedLogId.value === id) { selectedLogId.value = null; isDetailOpen.value = false }; await fetchLogs(); workbench.notifyStudentsChanged() }
  function openDetail(id: string) { selectedLogId.value = id; isDetailOpen.value = true }
  function closeDetail() { isDetailOpen.value = false }
  function openForm(id?: string) { editingLogId.value = id ?? null; isFormOpen.value = true }
  function closeForm() { isFormOpen.value = false; editingLogId.value = null }
  return { logs, selectedLogId, selectedLog, isDetailOpen, isFormOpen, editingLogId, fetchLogs, addLog, updateLog, deleteLog, openDetail, closeDetail, openForm, closeForm }
})
