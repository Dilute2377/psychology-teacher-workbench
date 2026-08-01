import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import { useTermStore } from './useTermStore'
import { useWorkbenchStore } from './workbench'
import type { LessonRecord } from '../types/schema'

export type LessonRecordDraft = Omit<LessonRecord, 'id' | 'createdAt' | 'updatedAt'>

export const useLessonStore = defineStore('lessons', () => {
  const lessonRecords = ref<LessonRecord[]>([])
  const selectedLessonId = ref<string | null>(null)
  const isFormOpen = ref(false)
  const editingLessonId = ref<string | null>(null)
  const termStore = useTermStore()
  const workbench = useWorkbenchStore()
  const selectedLesson = computed(() => lessonRecords.value.find((record) => record.id === selectedLessonId.value))

  async function fetchLessonRecords() {
    const termId = termStore.currentTermId
    lessonRecords.value = (await db.lessonRecords.toArray())
      .filter((record) => !termId || record.termId === termId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
    if (!selectedLessonId.value || !lessonRecords.value.some((record) => record.id === selectedLessonId.value)) selectedLessonId.value = lessonRecords.value[0]?.id ?? null
  }
  async function addLessonRecord(draft: LessonRecordDraft) {
    const now = new Date().toISOString()
    const record: LessonRecord = { ...draft, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
    await db.lessonRecords.add(record)
    await fetchLessonRecords()
    selectedLessonId.value = record.id
    workbench.notifyStudentsChanged()
    return record
  }
  async function updateLessonRecord(id: string, changes: Partial<LessonRecordDraft>) {
    await db.lessonRecords.update(id, { ...changes, updatedAt: new Date().toISOString() })
    await fetchLessonRecords()
    workbench.notifyStudentsChanged()
  }
  async function deleteLessonRecord(id: string) {
    await db.lessonRecords.delete(id)
    if (selectedLessonId.value === id) selectedLessonId.value = null
    await fetchLessonRecords()
    workbench.notifyStudentsChanged()
  }
  function openForm(id?: string) { editingLessonId.value = id ?? null; isFormOpen.value = true }
  function closeForm() { isFormOpen.value = false; editingLessonId.value = null }
  return { lessonRecords, selectedLessonId, selectedLesson, isFormOpen, editingLessonId, fetchLessonRecords, addLessonRecord, updateLessonRecord, deleteLessonRecord, openForm, closeForm }
})
