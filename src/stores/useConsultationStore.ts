import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import { useTermStore } from './useTermStore'
import { useWorkbenchStore } from './workbench'
import type { ConsultationRecord, RiskLevel } from '../types/schema'

export interface ConsultationFilters {
  termId?: string
  studentId?: string
  category?: string
}

export type ConsultationDraft = Omit<ConsultationRecord, 'id' | 'createdAt' | 'updatedAt'>
const categoryAliases: Record<string, string[]> = {
  '学业压力': ['学业压力', '学业'], '人际交往': ['人际交往', '人际'], '亲子关系': ['亲子关系', '亲子', '家庭'], '情绪困扰': ['情绪困扰', '情绪'], '自我认知': ['自我认知'], '适应问题': ['适应问题', '适应'], '危机干预': ['危机干预'],
}
export function matchesConsultationCategory(categories: string[], category?: string) { return !category || (categoryAliases[category] ?? [category]).some((item) => categories.includes(item)) }
/** 兼容早期演示记录中的简称，同时让界面统一使用当前的分类术语。 */
export function getConsultationCategoryLabel(category: string) {
  return Object.entries(categoryAliases).find(([, aliases]) => aliases.includes(category))?.[0] ?? category
}

export const useConsultationStore = defineStore('consultation', () => {
  const consultations = ref<ConsultationRecord[]>([])
  const selectedConsultationId = ref<string | null>(null)
  const isFormOpen = ref(false)
  const editingConsultationId = ref<string | null>(null)
  const isDetailOpen = ref(false)
  const termStore = useTermStore()
  const workbench = useWorkbenchStore()
  const selectedConsultation = computed(() => consultations.value.find((record) => record.id === selectedConsultationId.value))

  async function fetchConsultations(filters: ConsultationFilters = {}) {
    const termId = filters.termId ?? termStore.currentTermId
    const records = await db.consultations.toArray()
    consultations.value = records.filter((record) => (!termId || record.termId === termId) && (!filters.studentId || record.studentId === filters.studentId) && matchesConsultationCategory(record.problemCategories, filters.category)).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
    if (selectedConsultationId.value && !consultations.value.some((record) => record.id === selectedConsultationId.value)) { selectedConsultationId.value = null; isDetailOpen.value = false }
  }

  async function addConsultation(draft: ConsultationDraft, riskLevel?: RiskLevel) {
    const now = new Date().toISOString()
    const existingCount = await db.consultations.where('studentId').equals(draft.studentId).count()
    const record: ConsultationRecord = { ...draft, id: crypto.randomUUID(), sessionIndex: draft.sessionIndex ?? existingCount + 1, riskLevelAtTime: riskLevel, createdAt: now, updatedAt: now }
    await db.transaction('rw', db.consultations, db.students, async () => {
      await db.consultations.add(record)
      if (riskLevel) await db.students.update(record.studentId, { riskLevel, updatedAt: now })
    })
    await fetchConsultations()
    selectedConsultationId.value = record.id
    workbench.notifyStudentsChanged()
    return record
  }

  async function updateConsultation(id: string, changes: Partial<ConsultationDraft>, riskLevel?: RiskLevel) {
    const updatedAt = new Date().toISOString()
    await db.transaction('rw', db.consultations, db.students, async () => {
      await db.consultations.update(id, { ...changes, riskLevelAtTime: riskLevel, updatedAt })
      const saved = await db.consultations.get(id)
      if (saved && riskLevel) await db.students.update(saved.studentId, { riskLevel, updatedAt })
    })
    const record = await db.consultations.get(id)
    await fetchConsultations()
    workbench.notifyStudentsChanged()
    return record
  }

  async function deleteConsultation(id: string) {
    await db.transaction('rw', db.consultations, async () => {
      await db.consultations.delete(id)
    })
    await fetchConsultations()
    workbench.notifyStudentsChanged()
  }

  function openForm(id?: string) { editingConsultationId.value = id ?? null; isFormOpen.value = true }
  function closeForm() { isFormOpen.value = false; editingConsultationId.value = null }
  function openDetail(id: string) { selectedConsultationId.value = id; isDetailOpen.value = true }
  function closeDetail() { isDetailOpen.value = false }
  return { consultations, selectedConsultationId, selectedConsultation, isFormOpen, editingConsultationId, isDetailOpen, fetchConsultations, addConsultation, updateConsultation, deleteConsultation, openForm, closeForm, openDetail, closeDetail }
})
