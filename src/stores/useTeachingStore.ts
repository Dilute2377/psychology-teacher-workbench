import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import { useTermStore } from './useTermStore'
import { useWorkbenchStore } from './workbench'
import type { CourseProgress, LessonPlan, LessonRecord, TeachingMaterial, TeachingProgressUnit, WeeklySchedule } from '../types/schema'

export type LessonPlanDraft = Omit<LessonPlan, 'id' | 'createdAt' | 'updatedAt'>
export type LessonLogDraft = Pick<LessonRecord, 'grade' | 'className' | 'date' | 'reflection' | 'notableStudents'>
export type TeachingMaterialDraft = Pick<TeachingMaterial, 'type' | 'title' | 'description' | 'resourceNote' | 'gradeTarget' | 'tags' | 'attachment'>

const weekdayLabel = ['一', '二', '三', '四', '五', '六', '日']

export const useTeachingStore = defineStore('teaching', () => {
  const lessonPlans = ref<LessonPlan[]>([])
  const weeklySchedules = ref<WeeklySchedule[]>([])
  const courseProgress = ref<CourseProgress[]>([])
  const progressUnits = ref<TeachingProgressUnit[]>([])
  const lessonRecords = ref<LessonRecord[]>([])
  const teachingMaterials = ref<TeachingMaterial[]>([])
  const pendingMaterialId = ref<string | null>(null)
  const pendingPlanReference = ref('')
  /** 一次性打开“新增进度单元”的请求，不参与课表排课状态。 */
  const progressUnitRequestId = ref<string | null>(null)
  const selectedPlanId = ref<string | null>(null)
  const termStore = useTermStore(); const workbench = useWorkbenchStore()
  const currentTermId = computed(() => termStore.currentTermId)
  const planById = computed(() => new Map(lessonPlans.value.map((plan) => [plan.id, plan])))
  const scheduleById = computed(() => new Map(weeklySchedules.value.map((schedule) => [schedule.id, schedule])))

  async function fetchTeachingData() {
    const termId = currentTermId.value
    const [plans, schedules, progress, records, materials, units] = await Promise.all([db.lessonPlans.toArray(), db.weeklySchedules.toArray(), db.courseProgress.toArray(), db.lessonRecords.toArray(), db.teachingMaterials.toArray(), db.teachingProgressUnits.toArray()])
    lessonPlans.value = plans.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    weeklySchedules.value = schedules.filter((item) => !termId || item.termId === termId).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.period - b.period || a.frequency.localeCompare(b.frequency))
    courseProgress.value = progress.filter((item) => !termId || item.termId === termId).sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    lessonRecords.value = records.filter((item) => !termId || item.termId === termId).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
    teachingMaterials.value = materials.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    progressUnits.value = units.filter((item) => !termId || item.termId === termId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  async function addLessonPlan(draft: LessonPlanDraft) { const now = new Date().toISOString(); const record: LessonPlan = { ...draft, id: crypto.randomUUID(), createdAt: now, updatedAt: now }; await db.lessonPlans.add(record); await fetchTeachingData(); selectedPlanId.value = record.id; return record }
  async function updateLessonPlan(id: string, draft: Partial<LessonPlanDraft>) { await db.lessonPlans.update(id, { ...draft, updatedAt: new Date().toISOString() }); await fetchTeachingData() }
  async function deleteLessonPlan(id: string) { const linked = (await db.weeklySchedules.where('lessonPlanId').equals(id).count()) + (await db.courseProgress.where('lessonPlanId').equals(id).count()) + (await db.lessonRecords.where('lessonPlanId').equals(id).count()) + (await db.teachingProgressUnits.where('lessonPlanId').equals(id).count()); if (linked > 0) throw new Error('该教案已关联进度单元、课表或历史授课记录，不能删除。'); await db.lessonPlans.delete(id); await fetchTeachingData() }
  async function createProgressUnit(lessonPlanId: string, targetGrades: string[]) {
    const termId = currentTermId.value; if (!termId) throw new Error('请先选择当前学期。')
    const grades = [...new Set(targetGrades)].filter(Boolean); if (!grades.length) throw new Error('请至少选择一个授课年级。')
    const existing = progressUnits.value.find((item) => item.lessonPlanId === lessonPlanId && !item.archivedAt)
    if (existing) { const merged = [...new Set([...existing.targetGrades, ...grades])]; await db.teachingProgressUnits.update(existing.id, { targetGrades: merged, updatedAt: new Date().toISOString() }); await fetchTeachingData(); return existing.id }
    const now = new Date().toISOString(); const unit: TeachingProgressUnit = { id: crypto.randomUUID(), termId, lessonPlanId, targetGrades: grades, createdAt: now, updatedAt: now }
    await db.teachingProgressUnits.add(unit); await fetchTeachingData(); return unit.id
  }
  async function archiveProgressUnit(id: string) { await db.teachingProgressUnits.update(id, { archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); await fetchTeachingData() }
  async function restoreProgressUnit(id: string) { await db.teachingProgressUnits.update(id, { archivedAt: undefined, updatedAt: new Date().toISOString() }); await fetchTeachingData() }
  async function removeGradeFromProgressUnit(id: string, grade: string) {
    const unit = await db.teachingProgressUnits.get(id)
    if (!unit) return
    const targetGrades = unit.targetGrades.filter((item) => item !== grade)
    if (!targetGrades.length) await db.teachingProgressUnits.update(id, { archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    else await db.teachingProgressUnits.update(id, { targetGrades, updatedAt: new Date().toISOString() })
    await fetchTeachingData()
  }
  async function upsertWeeklySchedule(draft: Omit<WeeklySchedule, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) { const now = new Date().toISOString(); const record: WeeklySchedule = { ...draft, id: draft.id ?? crypto.randomUUID(), createdAt: now, updatedAt: now }; await db.weeklySchedules.put(record); await fetchTeachingData(); return record }
  async function assignPlan(scheduleId: string, lessonPlanId?: string) { await db.weeklySchedules.update(scheduleId, { lessonPlanId, status: lessonPlanId ? 'scheduled' : 'unplanned', completedAt: undefined, updatedAt: new Date().toISOString() }); await fetchTeachingData() }
  async function addTeachingMaterial(draft: TeachingMaterialDraft) { const now = new Date().toISOString(); const material: TeachingMaterial = { ...draft, id: crypto.randomUUID(), title: draft.title.trim(), description: draft.description.trim(), resourceNote: draft.resourceNote.trim(), gradeTarget: draft.gradeTarget?.trim() || '', tags: draft.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [], createdAt: now, updatedAt: now }; await db.teachingMaterials.add(material); await fetchTeachingData(); return material }
  async function updateTeachingMaterial(id: string, draft: Partial<TeachingMaterialDraft>) { await db.teachingMaterials.update(id, { ...draft, updatedAt: new Date().toISOString() }); await fetchTeachingData() }
  async function deleteTeachingMaterial(id: string) { const linked = (await db.weeklySchedules.toArray()).some((schedule) => schedule.materialIds?.includes(id)); if (linked) throw new Error('该素材已被课时引用，不能删除。'); await db.teachingMaterials.delete(id); if (pendingMaterialId.value === id) pendingMaterialId.value = null; await fetchTeachingData() }
  function queueMaterial(id: string) { pendingMaterialId.value = id }
  function clearQueuedMaterial() { pendingMaterialId.value = null }
  function requestProgressUnit(planId: string) { progressUnitRequestId.value = planId }
  function consumeProgressUnitRequest() { const planId = progressUnitRequestId.value; progressUnitRequestId.value = null; return planId }
  function prepareMaterialReference(material: TeachingMaterial) { pendingPlanReference.value = `【素材引用】${material.title}\n${material.description || material.resourceNote || '待补充素材说明'}` }
  function consumeMaterialReference() { const reference = pendingPlanReference.value; pendingPlanReference.value = ''; return reference }
  async function attachMaterialToSchedule(scheduleId: string, materialId: string) {
    const schedule = await db.weeklySchedules.get(scheduleId); if (!schedule) throw new Error('未找到目标课时。')
    const materialIds = schedule.materialIds?.includes(materialId) ? schedule.materialIds : [...(schedule.materialIds ?? []), materialId]
    await db.weeklySchedules.update(scheduleId, { materialIds, updatedAt: new Date().toISOString() }); pendingMaterialId.value = null; await fetchTeachingData()
  }
  async function schedulePlanAtSlot(planId: string, grade: string, className: string, dayOfWeek: number, period: number, frequency: WeeklySchedule['frequency'] = 'weekly') {
    const termId = currentTermId.value; if (!termId) throw new Error('请先选择当前学期。')
    const now = new Date().toISOString()
    const slotSchedules = weeklySchedules.value.filter((schedule) => schedule.dayOfWeek === dayOfWeek && schedule.period === period)
    const existing = slotSchedules.find((schedule) => schedule.frequency === frequency)
    if (!existing && (frequency === 'weekly' ? slotSchedules.length > 0 : slotSchedules.some((schedule) => schedule.frequency === 'weekly'))) throw new Error('该时段已有每周课程，不能再安排单双周课程。')
    if (existing) await db.weeklySchedules.update(existing.id, { lessonPlanId: planId, grade, className, status: 'scheduled', completedAt: undefined, durationMinutes: existing.durationMinutes ?? 45, updatedAt: now })
    else await db.weeklySchedules.add({ id: crypto.randomUUID(), termId, grade, className, dayOfWeek, period, lessonPlanId: planId, materialIds: [], frequency, status: 'scheduled', durationMinutes: 45, createdAt: now, updatedAt: now })
    await fetchTeachingData()
  }
  async function createFixedScheduleAtSlot(grade: string, className: string, dayOfWeek: number, period: number, frequency: WeeklySchedule['frequency'] = 'weekly') {
    const termId = currentTermId.value; if (!termId) throw new Error('请先选择当前学期。')
    const now = new Date().toISOString()
    const slotSchedules = weeklySchedules.value.filter((schedule) => schedule.dayOfWeek === dayOfWeek && schedule.period === period)
    const existing = slotSchedules.find((schedule) => schedule.frequency === frequency)
    if (!existing && (frequency === 'weekly' ? slotSchedules.length > 0 : slotSchedules.some((schedule) => schedule.frequency === 'weekly'))) throw new Error('该时段已有每周课程，不能再安排单双周课程。')
    if (existing) await db.weeklySchedules.update(existing.id, { grade, className, lessonPlanId: undefined, status: 'unplanned', completedAt: undefined, updatedAt: now })
    else await db.weeklySchedules.add({ id: crypto.randomUUID(), termId, grade, className, dayOfWeek, period, materialIds: [], frequency, status: 'unplanned', durationMinutes: 45, createdAt: now, updatedAt: now })
    await fetchTeachingData()
  }
  async function clearSchedulePlan(scheduleId: string) { await db.weeklySchedules.update(scheduleId, { lessonPlanId: undefined, status: 'unplanned', completedAt: undefined, updatedAt: new Date().toISOString() }); await fetchTeachingData() }
  async function deleteWeeklySchedule(scheduleId: string) {
    const schedule = await db.weeklySchedules.get(scheduleId); if (!schedule) return
    await db.transaction('rw', db.weeklySchedules, db.courseProgress, async () => {
      await db.weeklySchedules.delete(scheduleId)
      if (schedule.lessonPlanId) {
        const related = (await db.courseProgress.toArray()).filter((item) => item.termId === schedule.termId && item.lessonPlanId === schedule.lessonPlanId && item.grade === schedule.grade && item.className === schedule.className)
        await db.courseProgress.bulkDelete(related.map((item) => item.id))
      }
    })
    await fetchTeachingData()
  }
  async function completeSchedule(scheduleId: string, completedAt = new Date().toISOString().slice(0, 10)) {
    const schedule = await db.weeklySchedules.get(scheduleId); if (!schedule?.lessonPlanId) throw new Error('请先关联教案后再结课。')
    const termId = currentTermId.value; const plan = await db.lessonPlans.get(schedule.lessonPlanId); if (!termId || !plan) throw new Error('未找到当前学期或关联教案。')
    const now = new Date().toISOString(); const existing = (await db.courseProgress.toArray()).find((item) => item.termId === termId && item.lessonPlanId === schedule.lessonPlanId && item.grade === schedule.grade && item.className === schedule.className)
    await db.transaction('rw', db.weeklySchedules, db.lessonRecords, db.courseProgress, async () => {
      let lessonRecordId = existing?.lessonRecordId
      if (!lessonRecordId) { lessonRecordId = crypto.randomUUID(); await db.lessonRecords.add({ id: lessonRecordId, termId, grade: schedule.grade, className: schedule.className, topic: plan.topicTitle, date: completedAt, lessonPlanText: plan.procedureText, reflection: '', notableStudents: [], lessonPlanId: plan.id, weeklyScheduleId: schedule.id, createdAt: now, updatedAt: now }) }
      await db.weeklySchedules.update(schedule.id, { status: 'completed', completedAt, updatedAt: now })
      if (existing) await db.courseProgress.update(existing.id, { lessonRecordId, completedAt, updatedAt: now })
      else await db.courseProgress.add({ id: crypto.randomUUID(), termId, grade: schedule.grade, className: schedule.className, lessonPlanId: plan.id, status: 'completed', lessonRecordId, completedAt, createdAt: now, updatedAt: now })
    })
    await fetchTeachingData(); workbench.notifyStudentsChanged()
  }
  async function undoCompleteSchedule(scheduleId: string) {
    const schedule = await db.weeklySchedules.get(scheduleId); if (!schedule?.lessonPlanId) return
    const termId = currentTermId.value; const record = (await db.courseProgress.toArray()).find((item) => item.termId === termId && item.lessonPlanId === schedule.lessonPlanId && item.grade === schedule.grade && item.className === schedule.className)
    await db.transaction('rw', db.weeklySchedules, db.courseProgress, async () => { await db.weeklySchedules.update(scheduleId, { status: 'scheduled', completedAt: undefined, updatedAt: new Date().toISOString() }); if (record) await db.courseProgress.delete(record.id) })
    await fetchTeachingData()
  }
  async function toggleCourseCompletion(lessonPlanId: string, grade: string, className: string) {
    const termId = currentTermId.value; if (!termId) throw new Error('请先选择当前学期。')
    const existing = (await db.courseProgress.toArray()).find((item) => item.termId === termId && item.lessonPlanId === lessonPlanId && item.grade === grade && item.className === className)
    const schedule = (await db.weeklySchedules.toArray()).find((item) => item.termId === termId && item.lessonPlanId === lessonPlanId && item.grade === grade && item.className === className)
    if (existing) {
      await db.transaction('rw', db.courseProgress, db.weeklySchedules, async () => { await db.courseProgress.delete(existing.id); if (schedule) await db.weeklySchedules.update(schedule.id, { status: 'scheduled', completedAt: undefined, updatedAt: new Date().toISOString() }) })
      await fetchTeachingData(); return
    }
    if (schedule) { await completeSchedule(schedule.id); return }
    const plan = await db.lessonPlans.get(lessonPlanId); if (!plan) throw new Error('未找到对应教案。')
    const now = new Date().toISOString(); const lessonRecordId = crypto.randomUUID()
    await db.transaction('rw', db.lessonRecords, db.courseProgress, async () => {
      await db.lessonRecords.add({ id: lessonRecordId, termId, grade, className, topic: plan.topicTitle, date: now.slice(0, 10), lessonPlanText: plan.procedureText, reflection: '手动在课程进度大盘标记已上课。', notableStudents: [], lessonPlanId, createdAt: now, updatedAt: now })
      await db.courseProgress.add({ id: crypto.randomUUID(), termId, grade, className, lessonPlanId, status: 'completed', lessonRecordId, completedAt: now.slice(0, 10), createdAt: now, updatedAt: now })
    })
    await fetchTeachingData(); workbench.notifyStudentsChanged()
  }
  async function saveLessonLog(lessonPlan: LessonPlan, draft: LessonLogDraft, scheduleId?: string) {
    const termId = currentTermId.value; if (!termId) throw new Error('请先选择当前学期。')
    const notableStudents = JSON.parse(JSON.stringify(draft.notableStudents.map((student) => ({ studentId: student.studentId, studentName: student.studentName, note: student.note })))) as LessonRecord['notableStudents']
    const now = new Date().toISOString(); const record: LessonRecord = { id: crypto.randomUUID(), termId, grade: draft.grade, className: draft.className, topic: lessonPlan.topicTitle, date: draft.date, lessonPlanText: lessonPlan.procedureText, reflection: draft.reflection, notableStudents, lessonPlanId: lessonPlan.id, weeklyScheduleId: scheduleId, createdAt: now, updatedAt: now }
    const existing = (await db.courseProgress.toArray()).find((item) => item.termId === termId && item.grade === draft.grade && item.className === draft.className && item.lessonPlanId === lessonPlan.id)
    const persistedRecord = JSON.parse(JSON.stringify(record)) as LessonRecord
    await db.transaction('rw', db.lessonRecords, db.courseProgress, db.weeklySchedules, async () => {
      const existingRecord = existing ? await db.lessonRecords.get(existing.lessonRecordId) : undefined
      if (existingRecord) { persistedRecord.id = existingRecord.id; persistedRecord.createdAt = existingRecord.createdAt; await db.lessonRecords.put(persistedRecord) } else await db.lessonRecords.add(persistedRecord)
      if (scheduleId) await db.weeklySchedules.update(scheduleId, { status: 'completed', completedAt: draft.date, updatedAt: now })
      if (existing) await db.courseProgress.update(existing.id, { lessonRecordId: persistedRecord.id, completedAt: draft.date, updatedAt: now })
      else await db.courseProgress.add({ id: crypto.randomUUID(), termId, grade: draft.grade, className: draft.className, lessonPlanId: lessonPlan.id, status: 'completed', lessonRecordId: persistedRecord.id, completedAt: draft.date, createdAt: now, updatedAt: now })
    })
    await fetchTeachingData(); workbench.notifyStudentsChanged(); return record
  }
  function applicationCount(planId: string) { return new Set([...weeklySchedules.value.filter((item) => item.lessonPlanId === planId).map((item) => `${item.grade}-${item.className}`), ...courseProgress.value.filter((item) => item.lessonPlanId === planId).map((item) => `${item.grade}-${item.className}`)]).size }
  return { lessonPlans, weeklySchedules, courseProgress, progressUnits, lessonRecords, teachingMaterials, pendingMaterialId, pendingPlanReference, progressUnitRequestId, selectedPlanId, currentTermId, planById, scheduleById, weekdayLabel, fetchTeachingData, addLessonPlan, updateLessonPlan, deleteLessonPlan, createProgressUnit, archiveProgressUnit, restoreProgressUnit, removeGradeFromProgressUnit, upsertWeeklySchedule, assignPlan, clearSchedulePlan, deleteWeeklySchedule, completeSchedule, undoCompleteSchedule, toggleCourseCompletion, addTeachingMaterial, updateTeachingMaterial, deleteTeachingMaterial, queueMaterial, clearQueuedMaterial, requestProgressUnit, consumeProgressUnitRequest, prepareMaterialReference, consumeMaterialReference, attachMaterialToSchedule, schedulePlanAtSlot, createFixedScheduleAtSlot, saveLessonLog, applicationCount }
})
