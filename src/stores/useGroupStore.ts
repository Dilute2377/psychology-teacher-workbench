import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import { useTermStore } from './useTermStore'
import { useWorkbenchStore } from './workbench'
import type { GroupActivity } from '../types/schema'

export type GroupActivityDraft = Omit<GroupActivity, 'id' | 'createdAt' | 'updatedAt'>

export const useGroupStore = defineStore('groups', () => {
  const groupActivities = ref<GroupActivity[]>([])
  const selectedGroupId = ref<string | null>(null)
  const isFormOpen = ref(false)
  const editingGroupId = ref<string | null>(null)
  const termStore = useTermStore()
  const workbench = useWorkbenchStore()
  const selectedGroup = computed(() => groupActivities.value.find((activity) => activity.id === selectedGroupId.value))

  async function fetchGroupActivities(search = '') {
    const keyword = search.trim().toLocaleLowerCase()
    const termId = termStore.currentTermId
    const records = await db.groupActivities.toArray()
    groupActivities.value = records
      .filter((record) => (!termId || record.termId === termId) && (!keyword || [record.title, record.theme].join(' ').toLocaleLowerCase().includes(keyword)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
    if (!selectedGroupId.value || !groupActivities.value.some((activity) => activity.id === selectedGroupId.value)) selectedGroupId.value = groupActivities.value[0]?.id ?? null
  }

  async function addGroupActivity(draft: GroupActivityDraft) {
    const now = new Date().toISOString()
    const activity: GroupActivity = { ...draft, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
    await db.groupActivities.add(activity)
    await fetchGroupActivities()
    selectedGroupId.value = activity.id
    workbench.notifyStudentsChanged()
    return activity
  }

  async function updateGroupActivity(id: string, changes: Partial<GroupActivityDraft>) {
    await db.groupActivities.update(id, { ...changes, updatedAt: new Date().toISOString() })
    await fetchGroupActivities()
    workbench.notifyStudentsChanged()
    return db.groupActivities.get(id)
  }

  async function deleteGroupActivity(id: string) {
    await db.groupActivities.delete(id)
    if (selectedGroupId.value === id) selectedGroupId.value = null
    await fetchGroupActivities()
    workbench.notifyStudentsChanged()
  }

  function openForm(id?: string) { editingGroupId.value = id ?? null; isFormOpen.value = true }
  function closeForm() { isFormOpen.value = false; editingGroupId.value = null }
  return { groupActivities, selectedGroupId, selectedGroup, isFormOpen, editingGroupId, fetchGroupActivities, addGroupActivity, updateGroupActivity, deleteGroupActivity, openForm, closeForm }
})
