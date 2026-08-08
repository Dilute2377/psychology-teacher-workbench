import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import { studentService } from '../services/studentService'
import type { MedicalAttachment, Student, StudentWarningLevel } from '../types/schema'
import { useWorkbenchStore } from './workbench'

export const useStudentStore = defineStore('students', () => {
  const students = ref<Student[]>([])
  const isLoading = ref(false)
  const workbench = useWorkbenchStore()
  const keyStudents = computed(() => students.value.filter((student) => (student.warningLevel ?? warningFromRisk(student.riskLevel)) !== 'none' || student.isIndividualCase === true))

  function warningFromRisk(riskLevel: Student['riskLevel']): StudentWarningLevel {
    return riskLevel === 'crisis' ? 'red' : riskLevel === 'warning' ? 'orange' : riskLevel === 'attention' ? 'yellow' : 'none'
  }
  async function load() {
    isLoading.value = true
    try { students.value = await studentService.list() } finally { isLoading.value = false }
  }
  async function getById(id: string) { return db.students.get(id) }
  async function saveMedicalAttachments(id: string, attachments: MedicalAttachment[]) {
    await db.students.update(id, { medicalAttachments: attachments, updatedAt: new Date().toISOString() })
    const updated = await db.students.get(id)
    if (updated) students.value = students.value.map((student) => student.id === id ? updated : student)
    workbench.notifyStudentsChanged()
    return updated
  }
  async function updateStudent(id: string, changes: Partial<Student>) {
    await studentService.update(id, changes)
    await load()
    workbench.notifyStudentsChanged()
    return db.students.get(id)
  }

  return { students, keyStudents, isLoading, load, getById, saveMedicalAttachments, updateStudent }
})
