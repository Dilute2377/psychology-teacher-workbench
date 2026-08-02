import { db, studentRepository } from '../db'
import type { CensusResult, RiskLevel, Student } from '../types/schema'
import { STAGE_GRADES } from '../constants/grades'
import { inferSchoolStage } from '../utils/academic'

export interface StudentListFilters {
  grade?: string
  className?: string
  riskLevel?: RiskLevel
  search?: string
}

export interface StudentCensusResult extends CensusResult {
  batchTitle: string
  date: string
  scaleName: string
}

let reconcilePromise: Promise<void> | null = null

/**
 * 咨询记录必须能在学生主档案中被定位。历史版本允许先写入咨询、后删除学生，
 * 这会留下孤儿记录。读取学生列表前补建一个待补全的占位档案，保留原咨询的
 * studentId，避免咨询记录漂浮在档案系统之外，也不会覆盖已有学生资料。
 */
async function reconcileOrphanConsultations() {
  if (reconcilePromise) return reconcilePromise
  reconcilePromise = (async () => {
    const [students, consultations] = await Promise.all([db.students.toArray(), db.consultations.toArray()])
    const existingIds = new Set(students.map((student) => student.id))
    const orphans = consultations.filter((record) => Boolean(record.studentId) && !existingIds.has(record.studentId))
    if (!orphans.length) return
    const timestamp = new Date().toISOString()
    await db.students.bulkPut(orphans.map((record) => ({
      id: record.studentId,
      studentNo: `待补全-${record.studentId.slice(0, 8)}`,
      name: '待补全学生',
      gender: 'other' as const,
      enrollmentYear: new Date().getFullYear(),
      educationStage: 'junior' as const,
      status: 'active' as const,
      grade: '初一',
      className: '1班',
      emergencyContact: { name: '', relation: '', phone: '' },
      riskLevel: 'normal' as const,
      tags: ['待补全档案'],
      customFields: { reconciliationSource: 'consultation' },
      createdAt: record.createdAt || timestamp,
      updatedAt: timestamp,
    } satisfies Student)))
  })().finally(() => { reconcilePromise = null })
  return reconcilePromise
}

export const studentService = {
  async list(filters: StudentListFilters = {}) {
    const normalizedSearch = filters.search?.trim().toLocaleLowerCase() ?? ''
    await reconcileOrphanConsultations()
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
    const existing = await db.students.where('studentNo').equals(student.studentNo.trim()).first()
    if (existing) throw new Error(`学号“${student.studentNo.trim()}”已存在；同名学生可以新增，但学号必须唯一。`)
    const record: Student = { ...student, id: crypto.randomUUID(), createdAt: timestamp, updatedAt: timestamp }
    await studentRepository.create(record)
    return record
  },
  async update(id: string, changes: Partial<Omit<Student, 'id' | 'createdAt'>>) {
    await studentRepository.update(id, { ...changes, updatedAt: new Date().toISOString() })
    return studentRepository.getById(id)
  },
  updateRiskLevel: studentRepository.updateRiskLevel,
  async remove(id: string) {
    const [consultationCount, censusCount, groupActivities, workTrailCount, communicationCount, lessonRecords] = await Promise.all([
      db.consultations.where('studentId').equals(id).count(),
      db.censusResults.where('studentId').equals(id).count(),
      db.groupActivities.toArray(),
      db.workTrails.where('studentId').equals(id).count(),
      db.communicationLogs.where('studentId').equals(id).count(),
      db.lessonRecords.toArray(),
    ])
    const groupCount = groupActivities.filter((activity) => activity.memberStudentIds.includes(id)).length
    const lessonCount = lessonRecords.filter((record) => record.notableStudents.some((item) => item.studentId === id)).length
    if (consultationCount + censusCount + groupCount + workTrailCount + communicationCount + lessonCount > 0) {
      throw new Error('该学生已有历史服务记录，不能删除档案；如需隐藏，请在档案编辑中修改学籍状态。')
    }
    await studentRepository.remove(id)
  },
  async getConsultations(studentId: string) {
    const records = await db.consultations.where('studentId').equals(studentId).toArray()
    return records.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  },
  getConsultationRecord: (id: string) => db.consultations.get(id),
  async getCensusResults(studentId: string): Promise<StudentCensusResult[]> {
    const [batches, results] = await Promise.all([db.censusBatches.toArray(), db.censusResults.where('studentId').equals(studentId).toArray()])
    const batchById = new Map(batches.map((batch) => [batch.id, batch]))
    return results.flatMap((result) => { const batch = batchById.get(result.batchId); return batch ? [{ ...result, batchTitle: batch.title, date: batch.date, scaleName: batch.scaleName }] : [] }).sort((a, b) => b.date.localeCompare(a.date))
  },
  async importStudents(records: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>) {
    const timestamp = new Date().toISOString()
    const existingNumbers = new Set((await db.students.toArray()).map((student) => student.studentNo))
    const incomingNumbers = new Set<string>()
    for (const record of records) {
      const studentNo = record.studentNo.trim()
      if (!studentNo || existingNumbers.has(studentNo) || incomingNumbers.has(studentNo)) throw new Error(`学号“${studentNo || '空白'}”重复；同名学生可以保留，但学号必须唯一。`)
      incomingNumbers.add(studentNo)
    }
    await db.students.bulkAdd(records.map((record) => ({ ...record, id: crypto.randomUUID(), createdAt: timestamp, updatedAt: timestamp })))
  },
  async promotionPreview(nextStartYear: number) {
    const active = (await db.students.where('status').equals('active').toArray()).filter((student) => !student.gradeOverride?.trim())
    const stageOf = (student: Student) => student.educationStage ?? inferSchoolStage(student.grade)
    return {
      graduate: active.filter((student) => nextStartYear - student.enrollmentYear >= STAGE_GRADES[stageOf(student)].length).length,
      junior3: active.filter((student) => stageOf(student) === 'junior' && nextStartYear - student.enrollmentYear === 2).length,
      junior2: active.filter((student) => stageOf(student) === 'junior' && nextStartYear - student.enrollmentYear === 1).length,
    }
  },
  async promote(nextStartYear: number) {
    const active = (await db.students.where('status').equals('active').toArray()).filter((student) => !student.gradeOverride?.trim())
    await db.transaction('rw', db.students, async () => {
      for (const student of active) {
        const stage = student.educationStage ?? inferSchoolStage(student.grade)
        const grades = STAGE_GRADES[stage]
        const offset = nextStartYear - student.enrollmentYear
        const graduated = offset >= grades.length
        await db.students.update(student.id, {
          status: graduated ? 'graduated' : 'active',
          grade: graduated ? '已毕业' : grades[Math.max(0, offset)],
          educationStage: stage,
          tags: graduated && !student.tags.includes(`${nextStartYear - 1}届毕业生`) ? [...student.tags, `${nextStartYear - 1}届毕业生`] : student.tags,
          updatedAt: new Date().toISOString(),
        })
      }
    })
  },
}
