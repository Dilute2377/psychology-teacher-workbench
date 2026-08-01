import Dexie, { type EntityTable } from 'dexie'
import type { CensusBatch, ConsultationRecord, GroupActivity, LessonRecord, Student, SystemConfigRecord, TermConfig, TimelineEvent } from '../types/schema'

/** 浏览器本地数据库的唯一入口。敏感字段加密将在阶段五以独立服务接入。 */
export class PsychologyWorkbenchDatabase extends Dexie {
  students!: EntityTable<Student, 'id'>
  consultations!: EntityTable<ConsultationRecord, 'id'>
  terms!: EntityTable<TermConfig, 'id'>
  census!: EntityTable<CensusBatch, 'id'>
  groupActivities!: EntityTable<GroupActivity, 'id'>
  lessonRecords!: EntityTable<LessonRecord, 'id'>
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
  updateRiskLevel: (id: string, riskLevel: Student['riskLevel']) =>
    db.students.update(id, { riskLevel, updatedAt: new Date().toISOString() }),
  remove: (id: string) => db.students.delete(id),
}
