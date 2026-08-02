import { db } from '../db'
import { sortGrades } from '../constants/grades'
import type { ConsultationRecord, RiskLevel } from '../types/schema'

export type ReportPeriod = 'week' | 'month' | 'custom'

export interface ReportDateRange {
  start: string
  end: string
}

export interface ReportTrendPoint {
  label: string
  consultations: number
  risks: number
}

export interface ReportGradeRow {
  grade: string
  consultationCount: number
  highRiskCount: number
  highRiskBreakdown: string
  trailCount: number
  topConcern: string
  statusLabel: string
  statusTone: 'calm' | 'watch'
}

export interface ReportData {
  schoolName: string
  range: ReportDateRange
  rangeLabel: string
  generatedAt: string
  consultationCount: number
  firstVisitCount: number
  followUpCount: number
  activeRiskCount: number
  highRiskCount: number
  attentionRiskCount: number
  collaborationCount: number
  parentTrailCount: number
  leaderTrailCount: number
  closedCount: number
  referralCount: number
  riskDistribution: Array<{ key: RiskLevel; label: string; count: number; color: string }>
  concernDistribution: Array<{ label: string; count: number }>
  trend: ReportTrendPoint[]
  gradeDistribution: Array<{ label: string; count: number; color: string }>
  gradeRows: ReportGradeRow[]
}

const riskMeta: Array<{ key: RiskLevel; label: string; color: string }> = [
  { key: 'crisis', label: '红色 · 一级', color: '#e45d67' },
  { key: 'warning', label: '橙色 · 二级', color: '#e99b4b' },
  { key: 'attention', label: '黄色 · 三级', color: '#d7b35b' },
  { key: 'normal', label: '蓝色 · 四级', color: '#6e9caf' },
]

const concernAliases: Record<string, string> = {
  学业: '学业压力', 学业压力: '学业压力',
  人际: '人际交往', 人际交往: '人际交往',
  情绪: '情绪困扰', 情绪困扰: '情绪困扰',
  亲子: '亲子关系', 亲子关系: '亲子关系', 家庭: '亲子关系',
  自我认知: '自我认同', 自我认同: '自我认同',
  适应: '适应问题', 适应问题: '适应问题',
}

function parseDate(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return new Date(Number.NaN)
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function dateInput(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function displayDate(value: string) {
  return value.replaceAll('-', '.')
}

function startOfWeek(date: Date) {
  const result = new Date(date)
  const weekday = result.getDay() || 7
  result.setDate(result.getDate() - weekday + 1)
  result.setHours(0, 0, 0, 0)
  return result
}

export function getReportRange(period: ReportPeriod, customStart?: string, customEnd?: string, now = new Date()): ReportDateRange {
  if (period === 'custom' && customStart && customEnd && customStart <= customEnd) return { start: customStart, end: customEnd }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { start: dateInput(start), end: dateInput(end) }
  }
  const start = startOfWeek(now)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { start: dateInput(start), end: dateInput(end) }
}

function inRange(value: string | undefined, range: ReportDateRange) {
  const date = value?.slice(0, 10) ?? ''
  return Boolean(date && date >= range.start && date <= range.end)
}

function concernLabel(category: string) {
  return concernAliases[category] ?? category
}

function formatGeneratedAt(date = new Date()) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function makeTrend(range: ReportDateRange, consultations: ConsultationRecord[]) {
  const start = parseDate(range.start)
  const end = parseDate(range.end)
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
  const unit: 'day' | 'week' | 'month' = days <= 14 ? 'day' : days <= 90 ? 'week' : 'month'
  const points: ReportTrendPoint[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const pointStart = new Date(cursor)
    const pointEnd = new Date(cursor)
    if (unit === 'day') pointEnd.setDate(pointEnd.getDate())
    if (unit === 'week') pointEnd.setDate(pointEnd.getDate() + 6)
    if (unit === 'month') pointEnd.setMonth(pointEnd.getMonth() + 1, 0)
    if (pointEnd > end) pointEnd.setTime(end.getTime())
    const pointStartKey = dateInput(pointStart)
    const pointEndKey = dateInput(pointEnd)
    const selected = consultations.filter((record) => {
      const date = record.date.slice(0, 10)
      return date >= pointStartKey && date <= pointEndKey
    })
    points.push({
      label: unit === 'month' ? `${pointStart.getMonth() + 1}月` : unit === 'week' ? `${pointStart.getMonth() + 1}/${pointStart.getDate()}` : `${pointStart.getMonth() + 1}/${pointStart.getDate()}`,
      consultations: selected.length,
      risks: selected.filter((record) => record.riskLevelAtTime && record.riskLevelAtTime !== 'normal').length,
    })
    if (unit === 'month') cursor.setMonth(cursor.getMonth() + 1, 1)
    else cursor.setDate(cursor.getDate() + (unit === 'week' ? 7 : 1))
  }
  return points
}

export async function buildReportData(period: ReportPeriod, customStart?: string, customEnd?: string): Promise<ReportData> {
  const range = getReportRange(period, customStart, customEnd)
  const [students, consultations, trails, settings] = await Promise.all([
    db.students.toArray(),
    db.consultations.toArray(),
    db.workTrails.toArray(),
    db.settings.get('system'),
  ])
  const rangeConsultations = consultations.filter((record) => inRange(record.date, range))
  const rangeTrails = trails.filter((record) => inRange(record.dateTime, range))
  const activeStudents = students.filter((student) => student.status === 'active')
  const riskStudents = activeStudents.filter((student) => student.riskLevel !== 'normal')
  const highRiskStudents = riskStudents.filter((student) => student.riskLevel === 'crisis' || student.riskLevel === 'warning')
  const attentionStudents = riskStudents.filter((student) => student.riskLevel === 'attention')
  const concernCounts = new Map<string, number>()
  rangeConsultations.forEach((record) => record.problemCategories.forEach((category) => {
    const label = concernLabel(category)
    concernCounts.set(label, (concernCounts.get(label) ?? 0) + 1)
  }))
  const concernDistribution = [...concernCounts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 5)
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const grades = sortGrades([...new Set([...students.map((student) => student.grade), ...rangeConsultations.map((record) => studentsById.get(record.studentId)?.grade ?? '')].filter(Boolean))])
  const gradeColors = ['#7a9b8b', '#8aa4b8', '#c6a47b', '#9b8eaa', '#b28585', '#7e9a9a']
  const gradeDistribution = grades.map((grade, index) => ({ label: grade, count: rangeConsultations.filter((record) => studentsById.get(record.studentId)?.grade === grade).length, color: gradeColors[index % gradeColors.length] }))
  const gradeRows = grades.map((grade) => {
    const gradeConsultations = rangeConsultations.filter((record) => studentsById.get(record.studentId)?.grade === grade)
    const gradeStudents = activeStudents.filter((student) => student.grade === grade && student.riskLevel !== 'normal')
    const gradeHigh = gradeStudents.filter((student) => student.riskLevel === 'crisis' || student.riskLevel === 'warning')
    const breakdown = [
      gradeHigh.filter((student) => student.riskLevel === 'crisis').length ? `红${gradeHigh.filter((student) => student.riskLevel === 'crisis').length}` : '',
      gradeHigh.filter((student) => student.riskLevel === 'warning').length ? `橙${gradeHigh.filter((student) => student.riskLevel === 'warning').length}` : '',
      gradeStudents.filter((student) => student.riskLevel === 'attention').length ? `黄${gradeStudents.filter((student) => student.riskLevel === 'attention').length}` : '',
    ].filter(Boolean).join('/') || '—'
    const gradeConcerns = new Map<string, number>()
    gradeConsultations.forEach((record) => record.problemCategories.forEach((category) => {
      const label = concernLabel(category)
      gradeConcerns.set(label, (gradeConcerns.get(label) ?? 0) + 1)
    }))
    const topConcern = [...gradeConcerns.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '暂无明显集中因素'
    return { grade, consultationCount: gradeConsultations.length, highRiskCount: gradeHigh.length, highRiskBreakdown: breakdown, trailCount: rangeTrails.filter((trail) => trail.studentId && studentsById.get(trail.studentId)?.grade === grade).length, topConcern, statusLabel: gradeHigh.length >= 2 ? '重点关注' : gradeStudents.length ? '趋势可控' : '总体平稳', statusTone: (gradeHigh.length >= 2 ? 'watch' : 'calm') as 'watch' | 'calm' }
  })
  const schoolConfig = settings as (typeof settings & { schoolName?: string })
  const schoolName = schoolConfig?.schoolName?.trim() || '本校心理健康指导中心'
  return {
    schoolName,
    range,
    rangeLabel: `${displayDate(range.start)} - ${displayDate(range.end)}`,
    generatedAt: formatGeneratedAt(),
    consultationCount: rangeConsultations.length,
    firstVisitCount: rangeConsultations.filter((record) => (record.sessionIndex ?? 1) === 1).length,
    followUpCount: rangeConsultations.filter((record) => (record.sessionIndex ?? 1) > 1).length,
    activeRiskCount: riskStudents.length,
    highRiskCount: highRiskStudents.length,
    attentionRiskCount: attentionStudents.length,
    collaborationCount: rangeTrails.length,
    parentTrailCount: rangeTrails.filter((trail) => trail.category === 'parent').length,
    leaderTrailCount: rangeTrails.filter((trail) => trail.category === 'leader').length,
    closedCount: new Set(rangeConsultations.filter((record) => record.riskLevelAtTime === 'normal').map((record) => record.studentId)).size,
    referralCount: new Set(rangeConsultations.filter((record) => record.visitType === 'referral').map((record) => record.studentId)).size,
    riskDistribution: riskMeta.map((item) => ({ ...item, count: activeStudents.filter((student) => student.riskLevel === item.key).length })),
    concernDistribution,
    trend: makeTrend(range, rangeConsultations),
    gradeDistribution,
    gradeRows,
  }
}
