import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ConsultationRecord, TermConfig } from '../types/schema'

/** 跨页面发起咨询时携带的短生命周期上下文；保存或关闭抽屉后即清空。 */
export interface PendingConsultationContext {
  studentId: string
  visitType?: ConsultationRecord['visitType']
  problemCategories?: string[]
  subjective?: string
}

/** 仅保存界面状态；业务数据始终通过 db 服务层读取。 */
export const useWorkbenchStore = defineStore('workbench', () => {
  const currentTermId = ref('')
  const selectedStudentId = ref<string | null>(null)
  const pendingConsultationStudentId = ref<string | null>(null)
  const pendingConsultationContext = ref<PendingConsultationContext | null>(null)
  const globalSearch = ref('')
  const isLocked = ref(false)
  const terms = ref<TermConfig[]>([])
  const studentVersion = ref(0)
  const currentTerm = computed(() => terms.value.find((term) => term.id === currentTermId.value))

  function setCurrentTerm(termId: string) { currentTermId.value = termId }
  function lock() { isLocked.value = true }
  function unlock() { isLocked.value = false }
  function notifyStudentsChanged() { studentVersion.value += 1 }

  return { currentTermId, selectedStudentId, pendingConsultationStudentId, pendingConsultationContext, globalSearch, isLocked, terms, studentVersion, currentTerm, setCurrentTerm, lock, unlock, notifyStudentsChanged }
})
