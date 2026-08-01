import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { TermConfig } from '../types/schema'

/** 仅保存界面状态；业务数据始终通过 db 服务层读取。 */
export const useWorkbenchStore = defineStore('workbench', () => {
  const currentTermId = ref('')
  const selectedStudentId = ref<string | null>(null)
  const globalSearch = ref('')
  const isLocked = ref(false)
  const terms = ref<TermConfig[]>([])
  const studentVersion = ref(0)
  const currentTerm = computed(() => terms.value.find((term) => term.id === currentTermId.value))

  function setCurrentTerm(termId: string) { currentTermId.value = termId }
  function lock() { isLocked.value = true }
  function unlock() { isLocked.value = false }
  function notifyStudentsChanged() { studentVersion.value += 1 }

  return { currentTermId, selectedStudentId, globalSearch, isLocked, terms, studentVersion, currentTerm, setCurrentTerm, lock, unlock, notifyStudentsChanged }
})
