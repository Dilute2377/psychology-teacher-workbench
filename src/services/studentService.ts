import { db, studentRepository } from '../db'
import type { CensusBatch, CensusStudentResult, ConsultationRecord, GroupActivity, RiskLevel, Student, SystemConfigRecord, TermConfig, TimelineEvent } from '../types/schema'

export interface StudentListFilters {
  grade?: string
  className?: string
  riskLevel?: RiskLevel
  search?: string
}

export interface StudentCensusResult extends CensusStudentResult {
  batchId: string
  batchTitle: string
  date: string
  scaleName: string
}

const now = '2026-08-01T09:00:00.000Z'
const demoTerm: TermConfig = { id: '2026-2027-1', name: '2026-2027学年 第一学期', isCurrent: true, startDate: '2026-09-01', endDate: '2027-01-25' }
const contact = (name: string, relation: string, phone: string) => ({ name, relation, phone })

const demoStudents: Student[] = [
  { id: 'demo-student-01', studentNo: '20260101', name: '陈思涵', gender: 'female', grade: '初一', className: '1班', emergencyContact: contact('陈女士', '母亲', '13800001001'), riskLevel: 'normal', tags: ['适应良好', '班级心理委员'], createdAt: now, updatedAt: now },
  { id: 'demo-student-02', studentNo: '20260112', name: '李明远', gender: 'male', grade: '初一', className: '3班', emergencyContact: contact('李先生', '父亲', '13800001012'), riskLevel: 'attention', tags: ['学业焦虑', '睡眠困扰'], createdAt: now, updatedAt: now },
  { id: 'demo-student-03', studentNo: '20260205', name: '周雨桐', gender: 'female', grade: '初二', className: '2班', emergencyContact: contact('周女士', '母亲', '13800002005'), riskLevel: 'warning', tags: ['人际敏感', '需要持续关注'], createdAt: now, updatedAt: now },
  { id: 'demo-student-04', studentNo: '20260218', name: '王子轩', gender: 'male', grade: '初二', className: '5班', emergencyContact: contact('王女士', '母亲', '13800002018'), riskLevel: 'normal', tags: ['运动特长'], createdAt: now, updatedAt: now },
  { id: 'demo-student-05', studentNo: '20260303', name: '赵安然', gender: 'female', grade: '初三', className: '1班', emergencyContact: contact('赵先生', '父亲', '13800003003'), riskLevel: 'crisis', tags: ['重点支持', '家庭变故'], createdAt: now, updatedAt: now },
  { id: 'demo-student-06', studentNo: '20260316', name: '孙浩宇', gender: 'male', grade: '初三', className: '4班', emergencyContact: contact('孙女士', '母亲', '13800003016'), riskLevel: 'attention', tags: ['考试压力'], createdAt: now, updatedAt: now },
  { id: 'demo-student-07', studentNo: '20260226', name: '吴语宁', gender: 'female', grade: '初二', className: '3班', emergencyContact: contact('吴女士', '监护人', '13800002026'), riskLevel: 'warning', tags: ['同伴关系', '单亲'], createdAt: now, updatedAt: now },
  { id: 'demo-student-08', studentNo: '20260127', name: '刘泽宇', gender: 'male', grade: '初一', className: '4班', emergencyContact: contact('刘先生', '父亲', '13800001027'), riskLevel: 'normal', tags: ['适应观察'], createdAt: now, updatedAt: now },
]

const demoConsultations: ConsultationRecord[] = [
  { id: 'demo-consultation-01', studentId: 'demo-student-02', termId: demoTerm.id, date: '2026-09-18', durationMinutes: 40, visitType: 'active', problemCategories: ['学业', '情绪'], soap: { subjective: '担心考试成绩下降，入睡较晚。', objective: '表达连贯，谈及考试时略显紧张。', assessment: '存在阶段性学业压力，具备自我觉察。', plan: '练习睡前放松，下一周复谈。' }, isEncrypted: false, createdAt: now, updatedAt: now },
  { id: 'demo-consultation-02', studentId: 'demo-student-03', termId: demoTerm.id, date: '2026-10-08', durationMinutes: 45, visitType: 'referral', problemCategories: ['人际'], soap: { subjective: '最近和同学相处时常感到被忽略。', objective: '情绪低落但可保持交流。', assessment: '人际敏感加重，需要建立支持资源。', plan: '识别可信任同伴，约定下次回访。' }, isEncrypted: false, createdAt: now, updatedAt: now },
  { id: 'demo-consultation-03', studentId: 'demo-student-05', termId: demoTerm.id, date: '2026-10-22', durationMinutes: 50, visitType: 'census_followup', problemCategories: ['家庭', '情绪'], soap: { subjective: '近期家庭变化让我很难集中注意力。', objective: '有明显悲伤情绪，愿意接受支持。', assessment: '需持续风险评估并与监护人协作。', plan: '当天完成安全支持确认，三日内回访。' }, isEncrypted: false, createdAt: now, updatedAt: now },
]

const demoCensus: CensusBatch[] = [{
  id: 'demo-census-01', termId: demoTerm.id, title: '2026 学年秋季心理普查', date: '2026-09-12', scaleName: 'MHT', totalCount: 8, flaggedCount: 4,
  records: demoStudents.map((student, index) => ({ studentId: student.id, rawScores: { anxiety: [1.2, 2.6, 3.1, 1.4, 3.8, 2.4, 3.0, 1.3][index], depression: [1.1, 1.8, 2.7, 1.2, 3.7, 1.9, 2.4, 1.2][index] }, isFlagged: ['attention', 'warning', 'crisis'].includes(student.riskLevel), flaggedReasons: student.riskLevel === 'normal' ? [] : student.riskLevel === 'attention' ? ['焦虑维度需关注'] : ['情绪与人际维度需跟进'] })),
}]

const demoGroupActivities: GroupActivity[] = [{
  id: 'demo-group-01', termId: demoTerm.id, title: '新生适应与同伴支持', theme: '同伴关系', sessionIndex: 1, totalSessions: 2, date: '2026-09-25', memberStudentIds: ['demo-student-01', 'demo-student-03', 'demo-student-07'], processSummary: '通过合作任务讨论适应中的支持资源。', memberObservations: { 'demo-student-03': '愿意表达对同伴关系的期待。', 'demo-student-07': '在小组交流中逐步放松。' }, createdAt: now,
}]

const demoTimeline: TimelineEvent[] = [
  ...demoStudents.map((student) => ({ id: `demo-census-event-${student.id}`, studentId: student.id, termId: demoTerm.id, type: 'census' as const, date: '2026-09-12', title: '秋季心理普查', summary: student.riskLevel === 'normal' ? '测评结果在常模范围内。' : '已完成普查结果复核与后续关注安排。', sourceId: 'demo-census-01', riskLevelAtTime: student.riskLevel })),
  { id: 'demo-timeline-01', studentId: 'demo-student-02', termId: demoTerm.id, type: 'consultation', date: '2026-09-18', title: '个体咨询', summary: '围绕学业压力与睡眠困扰进行支持性谈话。', sourceId: 'demo-consultation-01', riskLevelAtTime: 'attention' },
  { id: 'demo-timeline-02', studentId: 'demo-student-03', termId: demoTerm.id, type: 'consultation', date: '2026-10-08', title: '个体咨询', summary: '讨论人际敏感体验与可获得支持。', sourceId: 'demo-consultation-02', riskLevelAtTime: 'warning' },
  { id: 'demo-timeline-03', studentId: 'demo-student-05', termId: demoTerm.id, type: 'consultation', date: '2026-10-22', title: '个体咨询', summary: '完成风险评估并确认当日支持安排。', sourceId: 'demo-consultation-03', riskLevelAtTime: 'crisis' },
  { id: 'demo-timeline-05', studentId: 'demo-student-03', termId: demoTerm.id, type: 'group', date: '2026-09-25', title: '团体辅导：新生适应与同伴支持', summary: '参与同伴支持主题团体辅导，并记录个别观察。', sourceId: 'demo-group-01', riskLevelAtTime: 'warning' },
  { id: 'demo-timeline-06', studentId: 'demo-student-07', termId: demoTerm.id, type: 'group', date: '2026-09-25', title: '团体辅导：新生适应与同伴支持', summary: '参与同伴支持主题团体辅导，并记录个别观察。', sourceId: 'demo-group-01', riskLevelAtTime: 'warning' },
  { id: 'demo-timeline-04', studentId: 'demo-student-07', termId: demoTerm.id, type: 'feedback', date: '2026-10-16', title: '日常反馈', summary: '班主任反馈其近两周课堂参与度有所提升。', sourceId: 'demo-feedback-01', riskLevelAtTime: 'warning' },
]

const defaultConfig: SystemConfigRecord = { id: 'system', currentTermId: demoTerm.id, themeMode: 'warm', autoBackupIntervalDays: 14, customCategories: ['学业', '亲子', '情绪', '人际'] }

export async function initializeStudentDemoData() {
  const config = await db.settings.get('system')
  if (config?.demoDataSeededAt || await db.students.count() > 0) return

  await db.transaction('rw', db.tables, async () => {
    await db.terms.put(demoTerm)
    await db.students.bulkPut(demoStudents)
    await db.consultations.bulkPut(demoConsultations)
    await db.census.bulkPut(demoCensus)
    await db.groupActivities.bulkPut(demoGroupActivities)
    await db.timelineEvents.bulkPut(demoTimeline)
    await db.settings.put({ ...defaultConfig, demoDataSeededAt: new Date().toISOString() })
  })
}

export const studentService = {
  async list(filters: StudentListFilters = {}) {
    const normalizedSearch = filters.search?.trim().toLocaleLowerCase() ?? ''
    const students = await studentRepository.list()
    return students.filter((student) =>
      (!filters.grade || student.grade === filters.grade)
      && (!filters.className || student.className === filters.className)
      && (!filters.riskLevel || student.riskLevel === filters.riskLevel)
      && (!normalizedSearch || [student.name, student.studentNo, student.grade, student.className, ...student.tags].join(' ').toLocaleLowerCase().includes(normalizedSearch)),
    )
  },
  getById: studentRepository.getById,
  async create(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) {
    const timestamp = new Date().toISOString()
    const record: Student = { ...student, id: crypto.randomUUID(), createdAt: timestamp, updatedAt: timestamp }
    await studentRepository.create(record)
    return record
  },
  async update(id: string, changes: Partial<Omit<Student, 'id' | 'createdAt'>>) {
    await studentRepository.update(id, { ...changes, updatedAt: new Date().toISOString() })
    return studentRepository.getById(id)
  },
  updateRiskLevel: studentRepository.updateRiskLevel,
  remove: studentRepository.remove,
  async getTimeline(studentId: string) {
    const events = await db.timelineEvents.where('studentId').equals(studentId).toArray()
    return events.sort((a, b) => b.date.localeCompare(a.date))
  },
  async getConsultations(studentId: string) {
    const records = await db.consultations.where('studentId').equals(studentId).toArray()
    return records.sort((a, b) => b.date.localeCompare(a.date))
  },
  async getCensusResults(studentId: string): Promise<StudentCensusResult[]> {
    const batches = await db.census.toArray()
    return batches.flatMap((batch) => batch.records.filter((record) => record.studentId === studentId).map((record) => ({ ...record, batchId: batch.id, batchTitle: batch.title, date: batch.date, scaleName: batch.scaleName }))).sort((a, b) => b.date.localeCompare(a.date))
  },
}
