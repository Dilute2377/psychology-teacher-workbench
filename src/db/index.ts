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
