import type { Student, TermConfig } from '../types/schema'
import { STAGE_GRADES, type SchoolStage } from '../constants/grades'

/** 学生年级只由入学年份和当前真实学年推导，不依赖历史显示字段。 */
export function getAcademicStartYear(term?: TermConfig) {
  return term ? Number(term.academicYear.split('-')[0]) : undefined
}

export function inferSchoolStage(grade?: string): SchoolStage {
  if (STAGE_GRADES.primary.includes(grade as never)) return 'primary'
  if (STAGE_GRADES.senior.includes(grade as never)) return 'senior'
  return 'junior'
}

export function getStudentGrade(student: Pick<Student, 'enrollmentYear' | 'status' | 'gradeOverride' | 'grade' | 'educationStage'> | undefined, term?: TermConfig) {
  if (!student) return '—'
  if (student.gradeOverride?.trim()) return student.gradeOverride.trim()
  if (student.status === 'graduated') return '已毕业'
  const startYear = getAcademicStartYear(term)
  if (!startYear) return '—'
  const stage = student.educationStage ?? inferSchoolStage(student.grade)
  const grades = STAGE_GRADES[stage]
  const offset = startYear - student.enrollmentYear
  if (offset < 0) return grades[0]
  return grades[offset] ?? '已毕业'
}
