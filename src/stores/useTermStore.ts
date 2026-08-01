import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import type { TermConfig } from '../types/schema'

type NewTerm = Omit<TermConfig, 'id' | 'createdAt' | 'name'> & { name?: string }
export type TermUsage = { consultations: number; census: number; lessonRecords: number; total: number }

function nameFor(academicYear: string, semester: 1 | 2) { return `${academicYear}学年 第${semester === 1 ? '一' : '二'}学期` }

export const useTermStore = defineStore('term', () => {
  const allTerms = ref<TermConfig[]>([])
  const currentTermId = ref('')
  const currentTerm = computed(() => allTerms.value.find((term) => term.id === currentTermId.value) ?? allTerms.value.find((term) => term.isCurrent))

  async function fetchTerms() {
    allTerms.value = (await db.terms.toArray()).sort((a, b) => b.startDate.localeCompare(a.startDate) || b.semester - a.semester)
    const selected = allTerms.value.find((term) => term.isCurrent) ?? allTerms.value[0]
    currentTermId.value = selected?.id ?? ''
  }
  async function setCurrentTerm(termId: string) {
    if (!allTerms.value.some((term) => term.id === termId)) throw new Error('未找到所选学期')
    await db.transaction('rw', db.terms, async () => {
      await db.terms.toCollection().modify({ isCurrent: false })
      await db.terms.update(termId, { isCurrent: true })
    })
    await fetchTerms()
  }
  async function addTerm(data: NewTerm) {
    const semester = data.semester
    const id = `${data.academicYear}-${semester}`
    if (await db.terms.get(id)) throw new Error('该学期已经存在')
    const record: TermConfig = { id, academicYear: data.academicYear, semester, name: data.name?.trim() || nameFor(data.academicYear, semester), startDate: data.startDate, endDate: data.endDate, isCurrent: data.isCurrent, createdAt: new Date().toISOString() }
    await db.transaction('rw', db.terms, async () => {
      if (record.isCurrent) await db.terms.toCollection().modify({ isCurrent: false })
      await db.terms.add(record)
    })
    await fetchTerms()
    return record
  }
  async function getTermUsage(termId: string): Promise<TermUsage> {
    const [consultations, census, lessonRecords] = await Promise.all([
      db.consultations.where('termId').equals(termId).count(), db.censusBatches.where('termId').equals(termId).count(), db.lessonRecords.where('termId').equals(termId).count(),
    ])
    return { consultations, census, lessonRecords, total: consultations + census + lessonRecords }
  }
  async function deleteTerm(termId: string) {
    const usage = await getTermUsage(termId)
    if (usage.total > 0) return { ok: false as const, reason: 'linked-data' as const, usage }
    if (currentTerm.value?.id === termId) return { ok: false as const, reason: 'current-term' as const, usage }
    await db.terms.delete(termId)
    await fetchTerms()
    return { ok: true as const, usage }
  }
  return { allTerms, currentTermId, currentTerm, fetchTerms, setCurrentTerm, addTerm, deleteTerm, getTermUsage }
})
