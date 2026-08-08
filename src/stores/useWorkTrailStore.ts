import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import { useWorkbenchStore } from './workbench'
import type { WorkTrail } from '../types/schema'

export type WorkTrailDraft = Omit<WorkTrail, 'id' | 'createdAt'>
export const WORK_TRAIL_CATEGORY_OPTIONS: Array<{ value: WorkTrail['category']; label: string }> = [
  { value: 'parent', label: '家长沟通' },
  { value: 'teacher', label: '班主任协同' },
  { value: 'leader', label: '领导指令' },
  { value: 'handover', label: '任务交接' },
  { value: 'subbing', label: '代课与杂务' },
  { value: 'disclaimer', label: '危机免责存证' },
]

export const useWorkTrailStore = defineStore('work-trails', () => {
  const trails = ref<WorkTrail[]>([])
  const selectedTrailId = ref<string | null>(null)
  const isDetailOpen = ref(false)
  const isFormOpen = ref(false)
  const editingTrailId = ref<string | null>(null)
  const toast = ref<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  type TrailFilters = { category?: WorkTrail['category'][]; keyword?: string; date?: string; studentId?: string }
  const activeFilters = ref<TrailFilters>({})
  const categoryCounts = ref<Record<WorkTrail['category'], number>>({ parent: 0, teacher: 0, leader: 0, handover: 0, subbing: 0, disclaimer: 0 })
  let toastTimer: ReturnType<typeof setTimeout> | undefined
  const workbench = useWorkbenchStore()
  const selectedTrail = computed(() => trails.value.find((item) => item.id === selectedTrailId.value))

  async function fetchTrails(filters?: TrailFilters) {
    if (filters) activeFilters.value = { ...filters, category: filters.category ? [...filters.category] : undefined }
    const applied = activeFilters.value
    const keyword = applied.keyword?.trim().toLowerCase() ?? ''
    const rows = await db.workTrails.toArray()
    categoryCounts.value = rows.reduce((counts, item) => { if (item.category in counts) counts[item.category] += 1; return counts }, { parent: 0, teacher: 0, leader: 0, handover: 0, subbing: 0, disclaimer: 0 } as Record<WorkTrail['category'], number>)
    trails.value = rows
      .filter((item) => !applied.category?.length || applied.category.includes(item.category))
      .filter((item) => !applied.date || item.dateTime.startsWith(applied.date!))
      .filter((item) => !applied.studentId || item.studentId === applied.studentId)
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
  async function deleteTrail(id: string) {
    // 附件以 data URL 保存在同一条 IndexedDB 记录中；先清空附件再删除，避免任何残留引用。
    await db.transaction('rw', db.workTrails, async () => {
      await db.workTrails.update(id, { attachments: [] })
      await db.workTrails.delete(id)
    })
    if (selectedTrailId.value === id) { selectedTrailId.value = null; isDetailOpen.value = false }
    await fetchTrails()
    workbench.notifyStudentsChanged()
  }
  function openDetail(id: string) { selectedTrailId.value = id; isDetailOpen.value = false }
  function closeDetail() { isDetailOpen.value = false }
  function openForm(id?: string) { editingTrailId.value = id ?? null; isFormOpen.value = true }
  function closeForm() { isFormOpen.value = false; editingTrailId.value = null }
  function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') { toast.value = { message, type }; if (toastTimer) clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = null }, 2800) }
  return { trails, selectedTrailId, selectedTrail, categoryCounts, isDetailOpen, isFormOpen, editingTrailId, toast, fetchTrails, addTrail, updateTrail, deleteTrail, openDetail, closeDetail, openForm, closeForm, showToast }
})
