import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import { getConsultationCategoryLabel } from './useConsultationStore'
import { useCrisisConfigStore, type CrisisLevelKey } from './useCrisisConfigStore'
import type { ConsultationRecord, RiskLevel, Student } from '../types/schema'

export type OverviewRiskLevel = 'level_1' | 'level_2' | 'level_3' | 'normal'
export function normalizeOverviewRiskLevel(level?: string | null): OverviewRiskLevel { return useCrisisConfigStore().resolveLevelKey(level) }
function overviewLevelForStudent(student: Student) { return normalizeOverviewRiskLevel(student.warningLevel ?? student.riskLevel) }

export const useOverviewStore = defineStore('overview', () => {
  const crisisConfig = useCrisisConfigStore()
  const students = ref<Student[]>([])
  const allConsultations = ref<ConsultationRecord[]>([])
  const consultations = ref<ConsultationRecord[]>([])
  const isLoading = ref(false)

  const activeStudents = computed(() => students.value.filter((student) => student.status === 'active'))
  const totalActiveStudents = computed(() => activeStudents.value.length)
  const riskCounts = computed(() => {
    const counts = { level_1: 0, level_2: 0, level_3: 0, normal: 0 } as Record<OverviewRiskLevel, number>
    activeStudents.value.forEach((student) => { counts[overviewLevelForStudent(student)] += 1 })
    return counts
  })
  const riskDistribution = computed(() => (['level_1', 'level_2', 'level_3', 'normal'] as CrisisLevelKey[]).map((key) => { const badge = crisisConfig.getLevelBadge(key); return { ...badge, count: riskCounts.value[key], percentage: totalActiveStudents.value ? (riskCounts.value[key] / totalActiveStudents.value) * 100 : 0 } }))
  const realtimeRiskStudentCount = computed(() => totalActiveStudents.value - riskCounts.value.normal)
  const normalStudentCount = computed(() => riskCounts.value.normal)
  const normalRate = computed(() => totalActiveStudents.value ? (normalStudentCount.value / totalActiveStudents.value) * 100 : 0)
  const warningRate = computed(() => totalActiveStudents.value ? (realtimeRiskStudentCount.value / totalActiveStudents.value) * 100 : 0)
  const historicalRiskStudentCount = computed(() => {
    const ids = new Set<string>()
    students.value.forEach((student) => {
      if (overviewLevelForStudent(student) !== 'normal') ids.add(student.id)
      const history = student.customFields?.riskHistory
      if (Array.isArray(history) && history.some((item: { level?: RiskLevel | string }) => normalizeOverviewRiskLevel(item.level) !== 'normal')) ids.add(student.id)
    })
    allConsultations.value.forEach((record) => { if (normalizeOverviewRiskLevel(record.riskLevelAtTime) !== 'normal') ids.add(record.studentId) })
    return ids.size
  })
  const firstVisitCount = computed(() => consultations.value.filter((record) => (record.sessionIndex ?? 1) === 1).length)
  const followUpCount = computed(() => consultations.value.filter((record) => (record.sessionIndex ?? 1) > 1).length)
  const categoryStats = computed(() => {
    const counts = new Map<string, number>()
    consultations.value.forEach((record) => record.problemCategories.forEach((category) => {
      const label = getConsultationCategoryLabel(category)
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }))
    return [...counts.entries()].map(([label, count]) => ({ label, count, percentage: consultations.value.length ? (count / consultations.value.length) * 100 : 0 })).sort((a, b) => b.count - a.count)
  })
  const maxCategoryCount = computed(() => Math.max(1, ...categoryStats.value.map((item) => item.count)))

  async function load(termId?: string) {
    crisisConfig.load()
    isLoading.value = true
    try {
      const [loadedStudents, loadedConsultations] = await Promise.all([db.students.toArray(), db.consultations.toArray()])
      students.value = loadedStudents
      allConsultations.value = loadedConsultations
      consultations.value = termId ? loadedConsultations.filter((record) => record.termId === termId) : []
    } finally {
      isLoading.value = false
    }
  }

  return {
    students, consultations, activeStudents, isLoading, totalActiveStudents, riskCounts, riskDistribution,
    realtimeRiskStudentCount, historicalRiskStudentCount, normalStudentCount, normalRate, warningRate,
    firstVisitCount, followUpCount, categoryStats, maxCategoryCount, load,
  }
})
