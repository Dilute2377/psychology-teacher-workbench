import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import { K12_GRADES, STAGE_GRADES, classNames, sortGrades } from '../constants/grades'
import type { SystemConfigRecord } from '../types/schema'

export type TeachingProfile = NonNullable<SystemConfigRecord['teachingProfile']>
export type SchoolProfile = NonNullable<SystemConfigRecord['schoolProfile']>

const fallback = (): SystemConfigRecord => ({ id: 'system', currentTermId: '', themeMode: 'warm', autoBackupIntervalDays: 14, customCategories: [] })
const defaultSchoolProfile = (): SchoolProfile => ({
  enabledStages: ['junior'],
  classCountByGrade: Object.fromEntries(K12_GRADES.map((grade) => [grade, 10])),
})
const defaultTeachingProfile = (): TeachingProfile => ({
  cycleMode: 'weekly', lessonDurationMinutes: 45, morningPeriods: 4, afternoonPeriods: 3,
  periods: [
    { label: '第 1 节', start: '08:00', end: '08:45' }, { label: '第 2 节', start: '08:55', end: '09:40' },
    { label: '第 3 节', start: '10:10', end: '10:55' }, { label: '第 4 节', start: '11:05', end: '11:50' },
    { label: '第 5 节', start: '14:00', end: '14:45' }, { label: '第 6 节', start: '14:55', end: '15:40' },
    { label: '第 7 节', start: '15:50', end: '16:35' },
  ],
})

function makePeriod(index: number, previous?: TeachingProfile['periods'][number]) {
  const defaults = defaultTeachingProfile().periods[index]
  return previous ?? defaults ?? { label: `第 ${index + 1} 节`, start: '', end: '' }
}

export const useSchoolConfigStore = defineStore('schoolConfig', () => {
  const schoolProfile = ref<SchoolProfile>(defaultSchoolProfile())
  const teachingProfile = ref<TeachingProfile>(defaultTeachingProfile())
  const isLoaded = ref(false)
  const enabledGrades = computed(() => sortGrades(schoolProfile.value.enabledStages.flatMap((stage) => [...STAGE_GRADES[stage]])))

  function classesForGrade(grade: string) { return classNames(schoolProfile.value.classCountByGrade[grade] ?? 10) }
  function resizeTeachingPeriods(morningPeriods: number, afternoonPeriods: number) {
    const total = Math.max(0, Number(morningPeriods) || 0) + Math.max(0, Number(afternoonPeriods) || 0)
    teachingProfile.value = {
      ...teachingProfile.value,
      morningPeriods: Math.max(0, Number(morningPeriods) || 0),
      afternoonPeriods: Math.max(0, Number(afternoonPeriods) || 0),
      periods: Array.from({ length: total }, (_, index) => ({ ...makePeriod(index, teachingProfile.value.periods[index]), label: `第 ${index + 1} 节` })),
    }
  }
  async function load() {
    const config = await db.settings.get('system')
    schoolProfile.value = { ...defaultSchoolProfile(), ...(config?.schoolProfile ?? {}), enabledStages: [(config?.schoolProfile?.enabledStages ?? ['junior'])[0] ?? 'junior'], classCountByGrade: { ...defaultSchoolProfile().classCountByGrade, ...(config?.schoolProfile?.classCountByGrade ?? {}) } }
    teachingProfile.value = { ...defaultTeachingProfile(), ...(config?.teachingProfile ?? {}) }
    isLoaded.value = true
    if (!config?.schoolProfile || !config?.teachingProfile) await persist(config)
  }
  async function persist(existing?: SystemConfigRecord) {
    const config = existing ?? await db.settings.get('system') ?? fallback()
    await db.settings.put({ ...config, schoolProfile: { ...schoolProfile.value, enabledStages: [...schoolProfile.value.enabledStages], classCountByGrade: { ...schoolProfile.value.classCountByGrade } }, teachingProfile: { ...teachingProfile.value, periods: teachingProfile.value.periods.map((period) => ({ ...period })) } })
  }
  async function updateSchoolProfile(next: Partial<SchoolProfile>) {
    const enabledStage = (next.enabledStages ?? schoolProfile.value.enabledStages)[0] ?? 'junior'
    schoolProfile.value = { ...schoolProfile.value, ...next, enabledStages: [enabledStage], classCountByGrade: { ...schoolProfile.value.classCountByGrade, ...(next.classCountByGrade ?? {}) } }
    await persist()
  }
  async function setClassCount(grade: string, value: number) {
    schoolProfile.value = { ...schoolProfile.value, classCountByGrade: { ...schoolProfile.value.classCountByGrade, [grade]: Math.max(1, Math.min(99, Math.floor(value) || 1)) } }
    await persist()
  }
  async function updateTeachingProfile(next: Partial<TeachingProfile>) {
    const morningPeriods = Math.max(0, Number(next.morningPeriods ?? teachingProfile.value.morningPeriods) || 0)
    const afternoonPeriods = Math.max(0, Number(next.afternoonPeriods ?? teachingProfile.value.afternoonPeriods) || 0)
    const requestedPeriods = next.periods ?? teachingProfile.value.periods
    const total = morningPeriods + afternoonPeriods
    teachingProfile.value = { ...teachingProfile.value, ...next, morningPeriods, afternoonPeriods, periods: Array.from({ length: total }, (_, index) => ({ ...makePeriod(index, requestedPeriods[index]), label: `第 ${index + 1} 节` })) }
    await persist()
  }
  return { schoolProfile, teachingProfile, isLoaded, enabledGrades, classesForGrade, resizeTeachingPeriods, load, updateSchoolProfile, setClassCount, updateTeachingProfile }
})
