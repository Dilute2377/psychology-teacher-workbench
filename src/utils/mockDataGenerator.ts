import { db } from '../db'
import { K12_GRADES, classNames, sortGrades } from '../constants/grades'
import type { CensusBatch, CensusResult, ConsultationRecord, Student, StudentWarningLevel, WorkTrail } from '../types/schema'

export type MockGenerationResult = { students: number; consultations: number; censusResults: number; workTrails: number }

const surnames = ['张', '李', '王', '刘', '陈', '杨', '黄', '赵', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗']
const givenNames = ['伟', '娜', '敏', '静', '磊', '洋', '欣', '婷', '浩', '杰', '倩', '晨', '宇', '宁', '悦', '涵', '博', '琪', '晨曦', '子轩', '思源', '可欣', '嘉怡', '昊然']
const concerns = ['学业压力', '人际交往', '情绪困扰', '亲子关系', '自我认同', '适应问题']
const trailCategories: WorkTrail['category'][] = ['parent', 'teacher', 'leader', 'handover']

function pick<T>(items: readonly T[]) { return items[Math.floor(Math.random() * items.length)] }
function dateOffset(days: number) { const date = new Date(); date.setDate(date.getDate() - Math.floor(Math.random() * days)); return date.toISOString().slice(0, 10) }
function dateTimeOffset(days: number) { return `${dateOffset(days)} ${String(8 + Math.floor(Math.random() * 10)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}` }
function warningForIndex(index: number, warningCount: number): StudentWarningLevel {
  if (index >= warningCount) return 'none'
  if (index < Math.max(2, Math.floor(warningCount * 0.12))) return 'red'
  if (index < Math.floor(warningCount * 0.45)) return 'orange'
  return 'yellow'
}
function riskForWarning(level: StudentWarningLevel): Student['riskLevel'] { return level === 'red' ? 'crisis' : level === 'orange' ? 'warning' : level === 'yellow' ? 'attention' : 'normal' }
function makeName(index: number) { return `${pick(surnames)}${pick(givenNames)}${index % 9 === 0 ? String(index / 9 + 1) : ''}` }

export async function generateMockData(count = 500): Promise<MockGenerationResult> {
  const config = await db.settings.get('system')
  const grades = sortGrades((config?.schoolProfile?.enabledStages ?? ['junior']).flatMap((stage) => {
    const ranges = stage === 'primary' ? K12_GRADES.slice(0, 6) : stage === 'senior' ? K12_GRADES.slice(9) : K12_GRADES.slice(6, 9)
    return [...ranges]
  }))
  const activeGrades = grades.length ? grades : ['初一', '初二', '初三']
  const classOptions = (grade: string) => classNames(config?.schoolProfile?.classCountByGrade?.[grade] ?? 10)
  const currentTerm = config?.currentTermId || (await db.terms.orderBy('startDate').reverse().first())?.id || 'mock-term'
  const warningCount = Math.min(count, 30 + Math.floor(Math.random() * 21))
  const relatedCount = Math.min(count, 100)
  const stamp = Date.now()
  const students: Student[] = Array.from({ length: count }, (_, index) => {
    const grade = activeGrades[index % activeGrades.length]
    const level = warningForIndex(index, warningCount)
    return {
      id: crypto.randomUUID(), studentNo: `MOCK-${stamp}-${String(index + 1).padStart(3, '0')}`, name: makeName(index), gender: index % 3 === 0 ? 'male' : index % 3 === 1 ? 'female' : 'other', enrollmentYear: new Date().getFullYear() - Math.max(0, activeGrades.indexOf(grade)), educationStage: activeGrades.includes(grade as never) ? (grade.startsWith('高') ? 'senior' : grade.startsWith('初') ? 'junior' : 'primary') : 'junior', status: 'active', grade, className: classOptions(grade)[index % classOptions(grade).length], emergencyContact: { name: `${pick(surnames)}家长`, relation: '监护人', phone: `13${String(100000000 + Math.floor(Math.random() * 899999999))}` }, riskLevel: riskForWarning(level), warningLevel: level, isIndividualCase: index < relatedCount, medicalAttachments: [], tags: level === 'none' ? [] : ['模拟预警'], customFields: { mockSeed: stamp }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isMock: true,
    }
  })
  const relatedStudents = students.slice(0, relatedCount)
  const consultations: ConsultationRecord[] = relatedStudents.map((student, index) => { const date = dateOffset(180); return { id: crypto.randomUUID(), studentId: student.id, termId: currentTerm, date, durationMinutes: 35 + (index % 3) * 5, sessionIndex: 1, visitType: index % 3 === 0 ? 'referral' : 'active', problemCategories: [concerns[index % concerns.length]], soap: { subjective: '模拟来访陈述：近期在学习与同伴相处方面感到压力。', objective: '模拟观察：情绪可接触，表达连贯。', assessment: '模拟评估：需要继续观察并提供支持。', plan: '模拟计划：一周后复访，必要时联系班主任。' }, isEncrypted: false, riskLevelAtTime: student.riskLevel, createdAt: `${date}T09:00:00.000Z`, updatedAt: `${date}T09:00:00.000Z`, isMock: true } })
  const censusBatch: CensusBatch = { id: crypto.randomUUID(), termId: currentTerm, title: '模拟心理普查批次', date: dateOffset(180), scaleName: 'MHT（模拟）', totalCount: relatedCount, flaggedCount: relatedStudents.filter((student) => student.riskLevel !== 'normal').length, createdAt: new Date().toISOString(), isMock: true }
  const censusResults: CensusResult[] = relatedStudents.map((student, index) => ({ id: crypto.randomUUID(), batchId: censusBatch.id, studentId: student.id, studentNo: student.studentNo, studentName: student.name, scores: { anxiety: Number((1 + Math.random() * 3).toFixed(1)), depression: Number((1 + Math.random() * 3).toFixed(1)), interpersonal: Number((1 + Math.random() * 3).toFixed(1)) }, isFlagged: student.riskLevel !== 'normal', flaggedReasons: student.riskLevel === 'normal' ? [] : [concerns[index % concerns.length]], createdAt: new Date().toISOString(), isMock: true }))
  const workTrails: WorkTrail[] = relatedStudents.map((student, index) => ({ id: crypto.randomUUID(), category: trailCategories[index % trailCategories.length], isStudentRelated: true, studentId: student.id, studentName: student.name, stakeholderName: index % 2 ? '班主任（模拟）' : '家长（模拟）', dateTime: dateTimeOffset(180), title: '模拟协同沟通留痕', content: '模拟记录：已完成家校协同与后续支持安排。', attachments: [], createdAt: new Date().toISOString(), isMock: true }))
  await db.transaction('rw', db.students, db.consultations, db.censusBatches, db.censusResults, db.workTrails, async () => {
    await db.students.bulkAdd(students)
    await db.consultations.bulkAdd(consultations)
    await db.censusBatches.add(censusBatch)
    await db.censusResults.bulkAdd(censusResults)
    await db.workTrails.bulkAdd(workTrails)
  })
  return { students: students.length, consultations: consultations.length, censusResults: censusResults.length, workTrails: workTrails.length }
}
