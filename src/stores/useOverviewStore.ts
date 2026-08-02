import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import { getConsultationCategoryLabel } from './useConsultationStore'
import type { ConsultationRecord, RiskLevel, Student } from '../types/schema'

export type OverviewRiskLevel = 'level_1' | 'level_2' | 'level_3' | 'normal'

export const OVERVIEW_RISK_META: Array<{ key: OverviewRiskLevel; label: string; shortLabel: string; color: string; barClass: string }> = [
  { key: 'level_1', label: '一级预警（红色·危机）', shortLabel: '红色', color: '#dc5c68', barClass: 'bg-rose-500' },
  { key: 'level_2', label: '二级预警（橙色·重点关注）', shortLabel: '橙色', color: '#ed9a48', barClass: 'bg-orange-400' },
  { key: 'level_3', label: '三级预警（黄色·一般关注）', shortLabel: '黄色', color: '#d6b24c', barClass: 'bg-amber-400' },
  { key: 'normal', label: '正常（无风险）', shortLabel: '正常', color: '#61a77f', barClass: 'bg-emerald-500' },
]

export function normalizeOverviewRiskLevel(level?: string | null): OverviewRiskLevel {
  if (level === 'level_1' || level === 'crisis') return 'level_1'
  if (level === 'level_2' || level === 'warning') return 'level_2'
  if (level === 'level_3' || level === 'attention') return 'level_3'
  return 'normal'
}

export const useOverviewStore = defineStore('overview', () => {
  const students = ref<Student[]>([])
  const allConsultations = ref<ConsultationRecord[]>([])
  const consultations = ref<ConsultationRecord[]>([])
  const isLoading = ref(false)

  const activeStudents = computed(() => students.value.filter((student) => student.status === 'active'))
  const totalActiveStudents = computed(() => activeStudents.value.length)
  const riskCounts = computed(() => {
    const counts = { level_1: 0, level_2: 0, level_3: 0, normal: 0 } as Record<OverviewRiskLevel, number>
    activeStudents.value.forEach((student) => { counts[normalizeOverviewRiskLevel(student.riskLevel)] += 1 })
    return counts
  })
  const riskDistribution = computed(() => OVERVIEW_RISK_META.map((item) => ({ ...item, count: riskCounts.value[item.key], percentage: totalActiveStudents.value ? (riskCounts.value[item.key] / totalActiveStudents.value) * 100 : 0 })))
  const realtimeRiskStudentCount = computed(() => totalActiveStudents.value - riskCounts.value.normal)
  const normalStudentCount = computed(() => riskCounts.value.normal)
  const normalRate = computed(() => totalActiveStudents.value ? (normalStudentCount.value / totalActiveStudents.value) * 100 : 0)
  const warningRate = computed(() => totalActiveStudents.value ? (realtimeRiskStudentCount.value / totalActiveStudents.value) * 100 : 0)
  const historicalRiskStudentCount = computed(() => {
    const ids = new Set<string>()
    students.value.forEach((student) => {
      if (normalizeOverviewRiskLevel(student.riskLevel) !== 'normal') ids.add(student.id)
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
