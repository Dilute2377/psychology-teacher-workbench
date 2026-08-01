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
