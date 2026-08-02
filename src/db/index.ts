import Dexie, { type EntityTable } from 'dexie'
import type { CensusBatch, CensusResult, CommunicationLog, ConsultationRecord, CourseProgress, GroupActivity, LessonPlan, LessonRecord, Student, SystemConfigRecord, TeachingMaterial, TeachingProgressUnit, TermConfig, TimelineEvent, WeeklySchedule, WorkTrail } from '../types/schema'

/** 浏览器本地数据库的唯一入口。敏感字段加密将在阶段五以独立服务接入。 */
export class PsychologyWorkbenchDatabase extends Dexie {
  students!: EntityTable<Student, 'id'>
  consultations!: EntityTable<ConsultationRecord, 'id'>
  terms!: EntityTable<TermConfig, 'id'>
  census!: EntityTable<CensusBatch, 'id'>
  censusBatches!: EntityTable<CensusBatch, 'id'>
  censusResults!: EntityTable<CensusResult, 'id'>
  groupActivities!: EntityTable<GroupActivity, 'id'>
  communicationLogs!: EntityTable<CommunicationLog, 'id'>
  workTrails!: EntityTable<WorkTrail, 'id'>
  lessonRecords!: EntityTable<LessonRecord, 'id'>
  lessonPlans!: EntityTable<LessonPlan, 'id'>
  weeklySchedules!: EntityTable<WeeklySchedule, 'id'>
  courseProgress!: EntityTable<CourseProgress, 'id'>
  teachingProgressUnits!: EntityTable<TeachingProgressUnit, 'id'>
  teachingMaterials!: EntityTable<TeachingMaterial, 'id'>
  timelineEvents!: EntityTable<TimelineEvent, 'id'>
  settings!: EntityTable<SystemConfigRecord, 'id'>

  constructor() {
    super('psychology-teacher-workbench')
    this.version(1).stores({
      students: 'id, studentNo, name, grade, className, riskLevel, createdAt, updatedAt',
      consultations: 'id, studentId, termId, date, visitType, createdAt, updatedAt',
      terms: 'id, isCurrent, startDate, endDate',
      census: 'id, termId, date, scaleName',
      groupActivities: 'id, termId, date, theme',
      lessonRecords: 'id, termId, grade, date',
      timelineEvents: 'id, studentId, termId, type, date, sourceId',
      settings: 'id',
    })
    this.version(2).stores({ students: 'id, studentNo, name, enrollmentYear, status, grade, className, riskLevel, createdAt, updatedAt', consultations: 'id, studentId, termId, date, visitType, createdAt, updatedAt', terms: 'id, isCurrent, startDate, endDate', census: 'id, termId, date, scaleName', groupActivities: 'id, termId, date, theme', lessonRecords: 'id, termId, grade, date', timelineEvents: 'id, studentId, termId, type, date, sourceId', settings: 'id' }).upgrade((tx) => tx.table('students').toCollection().modify((student: Student) => { student.enrollmentYear ??= student.grade === '初三' ? 2023 : student.grade === '初二' ? 2024 : 2025; student.status ??= 'active' }))
    this.version(3).stores({ students: 'id, studentNo, name, enrollmentYear, status, grade, className, riskLevel, createdAt, updatedAt', consultations: 'id, studentId, termId, date, visitType, createdAt, updatedAt', terms: 'id, academicYear, semester, isCurrent, startDate, endDate, createdAt', census: 'id, termId, date, scaleName', groupActivities: 'id, termId, date, theme', lessonRecords: 'id, termId, grade, date', timelineEvents: 'id, studentId, termId, type, date, sourceId', settings: 'id' }).upgrade((tx) => tx.table('terms').toCollection().modify((term: Partial<TermConfig>) => {
      const [academicYear = '', rawSemester = '1'] = term.id?.split('-').slice(-3).join('-').match(/(\d{4}-\d{4})-(\d)/)?.slice(1) ?? []
      term.academicYear ??= academicYear || term.startDate?.slice(0, 4) || '2025-2026'
      term.semester ??= Number(rawSemester) === 2 ? 2 : 1
      term.createdAt ??= new Date().toISOString()
    }))
    this.version(4).stores({ students: 'id, studentNo, name, enrollmentYear, status, grade, gradeOverride, className, riskLevel, createdAt, updatedAt', consultations: 'id, studentId, termId, date, visitType, createdAt, updatedAt', terms: 'id, academicYear, semester, isCurrent, startDate, endDate, createdAt', census: 'id, termId, date, scaleName', groupActivities: 'id, termId, date, theme', lessonRecords: 'id, termId, grade, date', timelineEvents: 'id, studentId, termId, type, date, sourceId', settings: 'id' }).upgrade((tx) => tx.table('students').toCollection().modify((student: Student) => {
      if (student.grade === '已毕业' && student.status === 'active') student.status = 'graduated'
    }))
    this.version(5).stores({ students: 'id, studentNo, name, enrollmentYear, status, grade, gradeOverride, className, riskLevel, createdAt, updatedAt', consultations: 'id, studentId, termId, date, visitType, sessionIndex, createdAt, updatedAt', terms: 'id, academicYear, semester, isCurrent, startDate, endDate, createdAt', census: 'id, termId, date, scaleName', groupActivities: 'id, termId, date, theme', lessonRecords: 'id, termId, grade, date', timelineEvents: 'id, studentId, termId, type, date, sourceId', settings: 'id' }).upgrade(async (tx) => {
      const table = tx.table('consultations')
      const records = await table.toArray() as ConsultationRecord[]
      const indexes = new Map<string, number>()
      records.sort((a, b) => a.studentId.localeCompare(b.studentId) || a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
      for (const record of records) {
        const next = (indexes.get(record.studentId) ?? 0) + 1
        indexes.set(record.studentId, next)
        if (!record.sessionIndex || record.sessionIndex < 1) record.sessionIndex = next
      }
      await table.bulkPut(records)
    })
    this.version(6).stores({ students: 'id, studentNo, name, enrollmentYear, status, grade, gradeOverride, className, riskLevel, createdAt, updatedAt', consultations: 'id, studentId, termId, date, visitType, sessionIndex, createdAt, updatedAt', terms: 'id, academicYear, semester, isCurrent, startDate, endDate, createdAt', census: 'id, termId, date, scaleName', censusBatches: 'id, termId, date, scaleName, createdAt', censusResults: 'id, batchId, studentId, studentNo, isFlagged, createdAt', groupActivities: 'id, termId, date, theme', lessonRecords: 'id, termId, grade, date', timelineEvents: 'id, studentId, termId, type, date, sourceId', settings: 'id' }).upgrade(async (tx) => {
      type LegacyBatch = Omit<CensusBatch, 'createdAt'> & { records?: Array<{ studentId: string; rawScores: Record<string, number>; isFlagged: boolean; flaggedReasons: string[] }> }
      const legacy = await tx.table('census').toArray() as LegacyBatch[]
      const createdAt = new Date().toISOString()
      const batches = legacy.map(({ records: _records, ...batch }) => ({ ...batch, createdAt }))
      const results: CensusResult[] = legacy.flatMap((batch) => (batch.records ?? []).map((record) => ({ id: `census-result-${batch.id}-${record.studentId}`, batchId: batch.id, studentId: record.studentId, studentNo: '', studentName: '', scores: record.rawScores, isFlagged: record.isFlagged, flaggedReasons: record.flaggedReasons, createdAt })))
      if (batches.length) await tx.table('censusBatches').bulkPut(batches)
      if (results.length) await tx.table('censusResults').bulkPut(results)
    })
    this.version(7).stores({ students: 'id, studentNo, name, enrollmentYear, status, grade, gradeOverride, className, riskLevel, createdAt, updatedAt', consultations: 'id, studentId, termId, date, visitType, sessionIndex, createdAt, updatedAt', terms: 'id, academicYear, semester, isCurrent, startDate, endDate, createdAt', census: 'id, termId, date, scaleName', censusBatches: 'id, termId, date, scaleName, createdAt', censusResults: 'id, batchId, studentId, studentNo, isFlagged, createdAt', groupActivities: 'id, termId, date, theme, createdAt, updatedAt', lessonRecords: 'id, termId, grade, date', timelineEvents: 'id, studentId, termId, type, date, sourceId', settings: 'id' }).upgrade((tx) => tx.table('groupActivities').toCollection().modify((activity: GroupActivity) => {
      activity.durationMinutes ??= 60
      activity.location ??= '团辅室'
      activity.updatedAt ??= activity.createdAt ?? new Date().toISOString()
    }))
    this.version(8).stores({ students: 'id, studentNo, name, enrollmentYear, status, grade, gradeOverride, className, riskLevel, createdAt, updatedAt', consultations: 'id, studentId, termId, date, visitType, sessionIndex, createdAt, updatedAt', terms: 'id, academicYear, semester, isCurrent, startDate, endDate, createdAt', census: 'id, termId, date, scaleName', censusBatches: 'id, termId, date, scaleName, createdAt', censusResults: 'id, batchId, studentId, studentNo, isFlagged, createdAt', groupActivities: 'id, termId, date, theme, createdAt, updatedAt', lessonRecords: 'id, termId, grade, className, date, createdAt, updatedAt', timelineEvents: 'id, studentId, termId, type, date, sourceId', settings: 'id' }).upgrade((tx) => tx.table('lessonRecords').toCollection().modify((record: Partial<LessonRecord>) => {
      const now = new Date().toISOString()
      record.className ??= ''
      record.lessonPlanText ??= ''
      record.reflection ??= ''
      record.notableStudents = (record.notableStudents ?? []).map((student) => ({ ...student, studentName: student.studentName ?? '' }))
      record.createdAt ??= now
      record.updatedAt ??= record.createdAt ?? now
    }))
    this.version(9).stores({ students: 'id, studentNo, name, enrollmentYear, status, grade, gradeOverride, className, riskLevel, createdAt, updatedAt', consultations: 'id, studentId, termId, date, visitType, sessionIndex, createdAt, updatedAt', terms: 'id, academicYear, semester, isCurrent, startDate, endDate, createdAt', census: 'id, termId, date, scaleName', censusBatches: 'id, termId, date, scaleName, createdAt', censusResults: 'id, batchId, studentId, studentNo, isFlagged, createdAt', groupActivities: 'id, termId, date, theme, createdAt, updatedAt', lessonRecords: 'id, termId, grade, className, lessonPlanId, weeklyScheduleId, date, createdAt, updatedAt', lessonPlans: 'id, gradeTarget, topicTitle, createdAt, updatedAt', weeklySchedules: 'id, termId, grade, className, weekday, lessonPlanId, createdAt, updatedAt', courseProgress: 'id, termId, grade, className, lessonPlanId, lessonRecordId, completedAt, updatedAt', timelineEvents: 'id, studentId, termId, type, date, sourceId', settings: 'id' })
    this.version(10).stores({ students: 'id, studentNo, name, enrollmentYear, status, grade, gradeOverride, className, riskLevel, createdAt, updatedAt', consultations: 'id, studentId, termId, date, visitType, sessionIndex, createdAt, updatedAt', terms: 'id, academicYear, semester, isCurrent, startDate, endDate, createdAt', census: 'id, termId, date, scaleName', censusBatches: 'id, termId, date, scaleName, createdAt', censusResults: 'id, batchId, studentId, studentNo, isFlagged, createdAt', groupActivities: 'id, termId, date, theme, createdAt, updatedAt', lessonRecords: 'id, termId, grade, className, lessonPlanId, weeklyScheduleId, date, createdAt, updatedAt', lessonPlans: 'id, gradeTarget, topicTitle, createdAt, updatedAt', teachingMaterials: 'id, type, gradeTarget, createdAt, updatedAt', weeklySchedules: 'id, termId, grade, className, weekday, lessonPlanId, cycle, createdAt, updatedAt', courseProgress: 'id, termId, grade, className, lessonPlanId, lessonRecordId, completedAt, updatedAt', timelineEvents: 'id, studentId, termId, type, date, sourceId', settings: 'id' })
    this.version(11).stores({ students: 'id, studentNo, name, enrollmentYear, status, grade, gradeOverride, className, riskLevel, createdAt, updatedAt', consultations: 'id, studentId, termId, date, visitType, sessionIndex, createdAt, updatedAt', terms: 'id, academicYear, semester, isCurrent, startDate, endDate, createdAt', census: 'id, termId, date, scaleName', censusBatches: 'id, termId, date, scaleName, createdAt', censusResults: 'id, batchId, studentId, studentNo, isFlagged, createdAt', groupActivities: 'id, termId, date, theme, createdAt, updatedAt', lessonRecords: 'id, termId, grade, className, lessonPlanId, weeklyScheduleId, date, createdAt, updatedAt', lessonPlans: 'id, gradeTarget, topicTitle, createdAt, updatedAt', teachingMaterials: 'id, type, gradeTarget, createdAt, updatedAt', weeklySchedules: 'id, termId, grade, className, weekday, lessonPlanId, cycle, status, completedAt, createdAt, updatedAt', courseProgress: 'id, termId, grade, className, lessonPlanId, lessonRecordId, completedAt, updatedAt', teachingProgressUnits: 'id, termId, lessonPlanId, archivedAt, createdAt, updatedAt', timelineEvents: 'id, studentId, termId, type, date, sourceId', settings: 'id' }).upgrade(async (tx) => {
      const progress = await tx.table('courseProgress').toArray() as CourseProgress[]
      await tx.table('weeklySchedules').toCollection().modify((schedule: WeeklySchedule) => {
        if (schedule.status) return
        const completed = Boolean(schedule.lessonPlanId && progress.some((item) => item.termId === schedule.termId && item.lessonPlanId === schedule.lessonPlanId && item.grade === schedule.grade && item.className === schedule.className))
        schedule.status = completed ? 'completed' : schedule.lessonPlanId ? 'scheduled' : 'unplanned'
      })
    })
    this.version(12).stores({ students: 'id, studentNo, name, enrollmentYear, status, grade, gradeOverride, className, riskLevel, createdAt, updatedAt', consultations: 'id, studentId, termId, date, visitType, sessionIndex, createdAt, updatedAt', terms: 'id, academicYear, semester, isCurrent, startDate, endDate, createdAt', census: 'id, termId, date, scaleName', censusBatches: 'id, termId, date, scaleName, createdAt', censusResults: 'id, batchId, studentId, studentNo, isFlagged, createdAt', groupActivities: 'id, termId, date, theme, createdAt, updatedAt', lessonRecords: 'id, termId, grade, className, lessonPlanId, weeklyScheduleId, date, createdAt, updatedAt', lessonPlans: 'id, gradeTarget, topicTitle, createdAt, updatedAt', teachingMaterials: 'id, type, gradeTarget, createdAt, updatedAt', weeklySchedules: 'id, termId, grade, className, dayOfWeek, period, lessonPlanId, frequency, status, completedAt, createdAt, updatedAt', courseProgress: 'id, termId, grade, className, lessonPlanId, lessonRecordId, completedAt, updatedAt', teachingProgressUnits: 'id, termId, lessonPlanId, archivedAt, createdAt, updatedAt', timelineEvents: 'id, studentId, termId, type, date, sourceId', settings: 'id' }).upgrade((tx) => tx.table('weeklySchedules').toCollection().modify((schedule: WeeklySchedule & { weekday?: number; timeSlot?: string; cycle?: 'weekly' | 'odd' | 'even' }) => {
      schedule.dayOfWeek ??= schedule.weekday ?? 1
      schedule.period ??= Number(schedule.timeSlot?.match(/\d+/)?.[0] ?? 1)
      schedule.frequency ??= schedule.cycle === 'odd' ? 'single' : schedule.cycle === 'even' ? 'double' : 'weekly'
    }))
    this.version(13).stores({ students: 'id, studentNo, name, enrollmentYear, status, grade, gradeOverride, className, riskLevel, createdAt, updatedAt', consultations: 'id, studentId, termId, date, visitType, sessionIndex, createdAt, updatedAt', terms: 'id, academicYear, semester, isCurrent, startDate, endDate, createdAt', census: 'id, termId, date, scaleName', censusBatches: 'id, termId, date, scaleName, createdAt', censusResults: 'id, batchId, studentId, studentNo, isFlagged, createdAt', groupActivities: 'id, termId, date, theme, createdAt, updatedAt', communicationLogs: 'id, studentId, studentName, termId, targetType, dateTime, createdAt', lessonRecords: 'id, termId, grade, className, lessonPlanId, weeklyScheduleId, date, createdAt, updatedAt', lessonPlans: 'id, gradeTarget, topicTitle, createdAt, updatedAt', teachingMaterials: 'id, type, gradeTarget, createdAt, updatedAt', weeklySchedules: 'id, termId, grade, className, dayOfWeek, period, lessonPlanId, frequency, status, completedAt, createdAt, updatedAt', courseProgress: 'id, termId, grade, className, lessonPlanId, lessonRecordId, completedAt, updatedAt', teachingProgressUnits: 'id, termId, lessonPlanId, archivedAt, createdAt, updatedAt', timelineEvents: 'id, studentId, termId, type, date, sourceId', settings: 'id' })
    this.version(14).stores({ students: 'id, studentNo, name, enrollmentYear, status, grade, gradeOverride, className, riskLevel, createdAt, updatedAt', consultations: 'id, studentId, termId, date, visitType, sessionIndex, createdAt, updatedAt', terms: 'id, academicYear, semester, isCurrent, startDate, endDate, createdAt', census: 'id, termId, date, scaleName', censusBatches: 'id, termId, date, scaleName, createdAt', censusResults: 'id, batchId, studentId, studentNo, isFlagged, createdAt', groupActivities: 'id, termId, date, theme, createdAt, updatedAt', communicationLogs: 'id, studentId, studentName, termId, targetType, dateTime, createdAt', workTrails: 'id, category, isStudentRelated, studentId, studentName, stakeholderName, dateTime, createdAt', lessonRecords: 'id, termId, grade, className, lessonPlanId, weeklyScheduleId, date, createdAt, updatedAt', lessonPlans: 'id, gradeTarget, topicTitle, createdAt, updatedAt', teachingMaterials: 'id, type, gradeTarget, createdAt, updatedAt', weeklySchedules: 'id, termId, grade, className, dayOfWeek, period, lessonPlanId, frequency, status, completedAt, createdAt, updatedAt', courseProgress: 'id, termId, grade, className, lessonPlanId, lessonRecordId, completedAt, updatedAt', teachingProgressUnits: 'id, termId, lessonPlanId, archivedAt, createdAt, updatedAt', timelineEvents: 'id, studentId, termId, type, date, sourceId', settings: 'id' }).upgrade(async (tx) => {
      const logs = await tx.table('communicationLogs').toArray() as CommunicationLog[]
      if (!logs.length) return
      const trails: WorkTrail[] = logs.map((log) => ({
        id: `trail-${log.id}`,
        category: log.targetType === 'other' ? 'handover' : log.targetType,
        isStudentRelated: Boolean(log.studentId),
        studentId: log.studentId || null,
        studentName: log.studentName || null,
        stakeholderName: log.targetName,
        dateTime: log.dateTime,
        title: `${log.targetType === 'parent' ? '家长沟通' : log.targetType === 'teacher' ? '班主任协同' : log.targetType === 'leader' ? '领导沟通' : '协同沟通'}留痕`,
        content: [log.summary, log.actionPlan ? `后续约定：${log.actionPlan}` : ''].filter(Boolean).join('\n\n'),
        attachments: log.attachments ?? [],
        createdAt: log.createdAt,
      }))
      await tx.table('workTrails').bulkPut(trails)
    })
  }
}

export const db = new PsychologyWorkbenchDatabase()

/**
 * 学生档案的低层数据访问接口。视图层应通过 studentService 使用它，
 * 以便未来在服务层统一加入加密、审计与导入导出策略。
 */
export const studentRepository = {
  list: () => db.students.orderBy('name').toArray(),
  getById: (id: string) => db.students.get(id),
  create: (student: Student) => db.students.add(student),
  update: (id: string, changes: Partial<Student>) => db.students.update(id, changes),
  async updateRiskLevel(id: string, riskLevel: Student['riskLevel']) {
    const updatedAt = new Date().toISOString()
    const student = await db.students.get(id)
    const customFields = student?.customFields ?? {}
    const previous = Array.isArray(customFields.riskHistory) ? customFields.riskHistory : []
    const last = previous[previous.length - 1]
    const riskHistory = last?.level === riskLevel
      ? previous
      : [...previous, { level: riskLevel, at: updatedAt }]
    return db.students.update(id, { riskLevel, customFields: { ...customFields, riskHistory }, updatedAt })
  },
  remove: (id: string) => db.students.delete(id),
}
