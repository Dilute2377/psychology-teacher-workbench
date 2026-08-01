import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import { useWorkbenchStore } from './workbench'
import type { WorkTrail } from '../types/schema'

export type WorkTrailDraft = Omit<WorkTrail, 'id' | 'createdAt'>

export const useWorkTrailStore = defineStore('work-trails', () => {
  const trails = ref<WorkTrail[]>([])
  const selectedTrailId = ref<string | null>(null)
  const isDetailOpen = ref(false)
  const isFormOpen = ref(false)
  const editingTrailId = ref<string | null>(null)
  const toast = ref<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  let toastTimer: ReturnType<typeof setTimeout> | undefined
  const workbench = useWorkbenchStore()
  const selectedTrail = computed(() => trails.value.find((item) => item.id === selectedTrailId.value))

  async function fetchTrails(filters: { category?: WorkTrail['category'][]; keyword?: string; date?: string; studentId?: string } = {}) {
    const keyword = filters.keyword?.trim().toLowerCase() ?? ''
    const rows = await db.workTrails.toArray()
    trails.value = rows
      .filter((item) => !filters.category?.length || filters.category.includes(item.category))
      .filter((item) => !filters.date || item.dateTime.startsWith(filters.date!))
      .filter((item) => !filters.studentId || item.studentId === filters.studentId)
      .filter((item) => !keyword || [item.studentName, item.stakeholderName, item.title, item.content].filter(Boolean).join(' ').toLowerCase().includes(keyword))
      .sort((a, b) => b.dateTime.localeCompare(a.dateTime))
    if (selectedTrailId.value && !trails.value.some((item) => item.id === selectedTrailId.value)) selectedTrailId.value = null
  }
  async function addTrail(draft: WorkTrailDraft) {
    const trail: WorkTrail = { ...draft, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    await db.workTrails.add(trail)
    await fetchTrails()
    selectedTrailId.value = trail.id
    workbench.notifyStudentsChanged()
    return trail
  }
  async function updateTrail(id: string, draft: Partial<WorkTrailDraft>) { await db.workTrails.update(id, draft); await fetchTrails(); workbench.notifyStudentsChanged(); return db.workTrails.get(id) }
  async function deleteTrail(id: string) { await db.workTrails.delete(id); if (selectedTrailId.value === id) { selectedTrailId.value = null; isDetailOpen.value = false }; await fetchTrails(); workbench.notifyStudentsChanged() }
  function openDetail(id: string) { selectedTrailId.value = id; isDetailOpen.value = true }
  function closeDetail() { isDetailOpen.value = false }
  function openForm(id?: string) { editingTrailId.value = id ?? null; isFormOpen.value = true }
  function closeForm() { isFormOpen.value = false; editingTrailId.value = null }
  function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') { toast.value = { message, type }; if (toastTimer) clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = null }, 2800) }
  return { trails, selectedTrailId, selectedTrail, isDetailOpen, isFormOpen, editingTrailId, toast, fetchTrails, addTrail, updateTrail, deleteTrail, openDetail, closeDetail, openForm, closeForm, showToast }
})
