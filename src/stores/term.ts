import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export interface AcademicTerm { id: string; name: string; startYear: number; isCurrent: boolean }

const initialTerms: AcademicTerm[] = [
  { id: '2025-2026-2', name: '2025-2026学年 第二学期', startYear: 2025, isCurrent: true },
  { id: '2025-2026-1', name: '2025-2026学年 第一学期', startYear: 2025, isCurrent: false },
  { id: '2024-2025-2', name: '2024-2025学年 第二学期', startYear: 2024, isCurrent: false },
]

export const useTermStore = defineStore('term', () => {
  const terms = ref<AcademicTerm[]>(initialTerms)
  const currentTermId = ref('2025-2026-2')
  const currentTerm = computed(() => terms.value.find((term) => term.id === currentTermId.value)!)
  function selectTerm(id: string) { currentTermId.value = id; terms.value = terms.value.map((term) => ({ ...term, isCurrent: term.id === id })) }
  return { terms, currentTermId, currentTerm, selectTerm }
})
