import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import { useTermStore } from './useTermStore'
import { useWorkbenchStore } from './workbench'
import type { CensusBatch, CensusResult, Student } from '../types/schema'

export type CensusImportRow = { studentNo: string; studentName: string; className?: string; scores: Record<string, number>; isFlagged: boolean; flaggedReasons: string[] }
export type CensusImportPayload = { title: string; scaleName: string; date: string; termId: string; rows: CensusImportRow[]; createMissingStudents: boolean }

export const useCensusStore = defineStore('census', () => {
  const censusBatches = ref<CensusBatch[]>([])
  const censusResults = ref<CensusResult[]>([])
  const selectedBatchId = ref<string | null>(null)
  const termStore = useTermStore()
  const workbench = useWorkbenchStore()
  const selectedBatch = computed(() => censusBatches.value.find((batch) => batch.id === selectedBatchId.value))

  async function fetchBatches() {
    const termId = termStore.currentTermId
    const all = await db.censusBatches.toArray()
    censusBatches.value = all.filter((batch) => !termId || batch.termId === termId).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    if (!selectedBatchId.value || !censusBatches.value.some((batch) => batch.id === selectedBatchId.value)) selectedBatchId.value = censusBatches.value[0]?.id ?? null
  }
  async function fetchResults(batchId = selectedBatchId.value) {
    censusResults.value = batchId ? await db.censusResults.where('batchId').equals(batchId).toArray() : []
    return censusResults.value
  }
  async function selectBatch(batchId: string) { selectedBatchId.value = batchId; await fetchResults(batchId) }
  async function importBatch(payload: CensusImportPayload) {
    if (!payload.termId || !payload.title.trim() || !payload.scaleName.trim() || !payload.date || !payload.rows.length) throw new Error('请完成批次名称、量表、日期和有效数据。')
    const now = new Date().toISOString()
    const existingStudents = new Map((await db.students.toArray()).map((student) => [student.studentNo, student]))
    const year = Number(termStore.currentTerm?.startDate.slice(0, 4) ?? new Date().getFullYear())
    const newStudents: Student[] = []
    const rows = payload.rows.map((row) => {
      let student = existingStudents.get(row.studentNo)
      if (!student && payload.createMissingStudents) {
        student = { id: crypto.randomUUID(), studentNo: row.studentNo, name: row.studentName || '未命名学生', gender: 'other', enrollmentYear: year, status: 'active', grade: '初一', className: row.className?.trim() || '未分班', emergencyContact: { name: '', relation: '', phone: '' }, riskLevel: 'normal', tags: ['普查导入'], createdAt: now, updatedAt: now }
        existingStudents.set(student.studentNo, student)
        newStudents.push(student)
      }
      return { row, student }
    }).filter((item): item is { row: CensusImportRow; student: Student } => Boolean(item.student))
    const batch: CensusBatch = { id: crypto.randomUUID(), termId: payload.termId, title: payload.title.trim(), scaleName: payload.scaleName.trim(), date: payload.date, totalCount: rows.length, flaggedCount: rows.filter((item) => item.row.isFlagged).length, createdAt: now }
    const results: CensusResult[] = rows.map(({ row, student }) => ({ id: crypto.randomUUID(), batchId: batch.id, studentId: student.id, studentNo: student.studentNo, studentName: student.name, scores: row.scores, isFlagged: row.isFlagged, flaggedReasons: row.flaggedReasons, createdAt: now }))
    await db.transaction('rw', db.students, db.censusBatches, db.censusResults, async () => {
      if (newStudents.length) await db.students.bulkAdd(newStudents)
      await db.censusBatches.add(batch)
      await db.censusResults.bulkAdd(results)
    })
    await fetchBatches()
    await selectBatch(batch.id)
    workbench.notifyStudentsChanged()
    return batch
  }
  async function deleteBatch(batchId: string) {
    const results = await db.censusResults.where('batchId').equals(batchId).toArray()
    await db.transaction('rw', db.censusBatches, db.censusResults, async () => {
      await db.censusBatches.delete(batchId)
      await db.censusResults.bulkDelete(results.map((result) => result.id))
    })
    await fetchBatches(); await fetchResults(); workbench.notifyStudentsChanged()
  }
  return { censusBatches, censusResults, selectedBatchId, selectedBatch, fetchBatches, fetchResults, selectBatch, importBatch, deleteBatch }
})
