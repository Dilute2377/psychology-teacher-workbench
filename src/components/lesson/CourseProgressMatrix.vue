<script setup lang="ts">
import { computed, ref } from 'vue'
import { Archive, CheckCircle2, Eye, Plus, X } from '@lucide/vue'
import { useTeachingStore } from '../../stores/useTeachingStore'
import type { LessonPlan, TeachingProgressUnit, WeeklySchedule } from '../../types/schema'

const props = defineProps<{ classes: Array<{ grade: string; className: string }> }>()
const emit = defineEmits<{ open: [plan: LessonPlan, schedule: WeeklySchedule | null]; requestUnit: [planId?: string] }>()
const teachingStore = useTeachingStore(); const gradeFilter = ref(''); const expandedByUnit = ref<Record<string, string[]>>({})
const grades = computed(() => [...new Set(props.classes.map((item) => item.grade))])
const visibleUnits = computed(() => teachingStore.progressUnits.filter((unit) => !unit.archivedAt && (!gradeFilter.value || unit.targetGrades.includes(gradeFilter.value))).map((unit) => ({ unit, plan: teachingStore.planById.get(unit.lessonPlanId) })).filter((item): item is { unit: TeachingProgressUnit; plan: LessonPlan } => Boolean(item.plan)))
const archivedUnits = computed(() => teachingStore.progressUnits.filter((unit) => Boolean(unit.archivedAt)).map((unit) => ({ unit, plan: teachingStore.planById.get(unit.lessonPlanId) })).filter((item): item is { unit: TeachingProgressUnit; plan: LessonPlan } => Boolean(item.plan)))
function shownTags(unit: TeachingProgressUnit) { return unit.targetGrades.filter((grade) => !gradeFilter.value || grade === gradeFilter.value) }
function expandedGrades(unit: TeachingProgressUnit) { return shownTags(unit).filter((grade) => (expandedByUnit.value[unit.id] ?? []).includes(grade)) }
function toggleGrade(unit: TeachingProgressUnit, grade: string) { const current = expandedByUnit.value[unit.id] ?? []; expandedByUnit.value = { ...expandedByUnit.value, [unit.id]: current.includes(grade) ? current.filter((item) => item !== grade) : [...current, grade] } }
function classesForGrade(grade: string) { return props.classes.filter((item) => item.grade === grade) }
function schedule(planId: string, grade: string, className: string) { return teachingStore.weeklySchedules.filter((item) => item.lessonPlanId === planId && item.grade === grade && item.className === className).sort((a, b) => Number(b.status === 'completed') - Number(a.status === 'completed'))[0] ?? null }
function completed(planId: string, grade: string, className: string) { return teachingStore.courseProgress.find((item) => item.lessonPlanId === planId && item.grade === grade && item.className === className) ?? null }
function completedCount(unit: TeachingProgressUnit) { return props.classes.filter((item) => unit.targetGrades.includes(item.grade) && Boolean(completed(unit.lessonPlanId, item.grade, item.className))).length }
function count(unit: TeachingProgressUnit) { return props.classes.filter((item) => unit.targetGrades.includes(item.grade)).length }
function progressPercent(unit: TeachingProgressUnit) { const total = count(unit); return total ? Math.round(completedCount(unit) / total * 100) : 0 }
function scheduleText(item: WeeklySchedule) { return `周${teachingStore.weekdayLabel[item.dayOfWeek - 1]}第${item.period}节` }
function dropPlan(event: DragEvent) { const planId = event.dataTransfer?.getData('application/x-lesson-plan') || event.dataTransfer?.getData('text/plain'); if (planId && teachingStore.planById.has(planId)) emit('requestUnit', planId) }
async function archive(unit: TeachingProgressUnit) { if (!window.confirm('归档该进度单元？')) return; await teachingStore.archiveProgressUnit(unit.id) }
async function removeGrade(unit: TeachingProgressUnit, grade: string) { if (!window.confirm(`从当前进度单元移除“${grade}”？`)) return; await teachingStore.removeGradeFromProgressUnit(unit.id, grade) }
async function restore(unit: TeachingProgressUnit) { await teachingStore.restoreProgressUnit(unit.id) }
async function toggleCompletion(plan: LessonPlan, grade: string, className: string) { await teachingStore.toggleCourseCompletion(plan.id, grade, className) }
</script>

<template>
  <section class="relative" @dragover.prevent @drop.prevent="dropPlan($event)">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <button type="button" class="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800" @click="emit('requestUnit')"><Plus :size="16" />新增进度单元</button>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <button class="rounded-full px-3 py-1.5 text-xs" :class="!gradeFilter ? 'bg-emerald-600 text-white font-medium shadow-sm' : 'border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'" @click="gradeFilter = ''">全部年级</button>
        <button v-for="grade in grades" :key="grade" class="rounded-full px-3 py-1.5 text-xs" :class="gradeFilter === grade ? 'bg-emerald-600 text-white font-medium shadow-sm' : 'border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'" @click="gradeFilter = grade">{{ grade }}</button>
      </div>
    </header>
    <div v-if="!visibleUnits.length" class="mt-5 rounded-2xl border-2 border-dashed border-stone-300 bg-white px-6 py-14 text-center" @dragover.prevent @drop.prevent.stop="dropPlan($event)"><p class="text-base font-semibold text-stone-700">当前大盘还没有进度单元</p></div>
    <div v-else class="mt-5 space-y-4">
      <article v-for="item in visibleUnits" :key="item.unit.id" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header class="flex flex-wrap items-center gap-3 px-4 py-3">
          <h3 class="min-w-40 flex-1 font-semibold text-slate-800">{{ item.plan.topicTitle }}</h3>
          <div class="flex flex-wrap items-center gap-1.5">
            <span v-for="grade in shownTags(item.unit)" :key="grade" class="inline-flex items-center rounded-full border py-0.5 pl-2 text-[11px]" :class="expandedGrades(item.unit).includes(grade) ? 'border-emerald-300 bg-emerald-100 font-semibold text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-600'"><button type="button" @click="toggleGrade(item.unit, grade)">{{ grade }}</button><button type="button" class="ml-1 rounded-full p-0.5 hover:bg-white hover:text-rose-600" :class="expandedGrades(item.unit).includes(grade) ? 'text-emerald-600' : 'text-slate-400'" :aria-label="`移除 ${grade}`" @click.stop="removeGrade(item.unit, grade)"><X :size="12" /></button></span>
          </div>
          <div class="flex min-w-40 items-center gap-2"><div class="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-slate-100"><div class="h-full bg-emerald-500" :style="{ width: `${progressPercent(item.unit)}%` }" /></div><span class="whitespace-nowrap text-xs text-slate-500">已上 {{ completedCount(item.unit) }}/{{ count(item.unit) }} 班 ({{ progressPercent(item.unit) }}%)</span></div>
          <button type="button" class="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800" @click.stop="emit('open', item.plan, null)"><Eye :size="14" />教案速览</button>
          <button type="button" class="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-amber-800" @click.stop="archive(item.unit)"><Archive :size="14" />归档/隐藏</button>
        </header>
        <div v-if="expandedGrades(item.unit).length" class="overflow-x-auto border-t border-slate-100 pb-2 pt-3">
          <div class="flex min-w-max flex-nowrap gap-3 px-4">
            <section v-for="grade in expandedGrades(item.unit)" :key="grade" class="shrink-0"><p class="mb-2 px-1 text-xs font-semibold text-slate-600">{{ grade }}</p><div class="flex flex-nowrap gap-2"><div v-for="target in classesForGrade(grade)" :key="`${item.unit.id}-${target.grade}-${target.className}`" class="w-32 shrink-0 rounded-md border p-2 text-xs font-medium transition-all" :class="completed(item.plan.id, target.grade, target.className) ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:shadow-sm'"><p class="truncate font-semibold">{{ target.grade }}{{ target.className }}</p><p v-if="schedule(item.plan.id, target.grade, target.className)" class="mt-1 truncate text-[10px]" :class="completed(item.plan.id, target.grade, target.className) ? 'text-emerald-700' : 'text-slate-400'">{{ scheduleText(schedule(item.plan.id, target.grade, target.className)!) }}</p><div v-else class="mt-1 h-[15px]" /><button type="button" class="mt-2 w-full rounded-md px-1.5 py-1 text-[10px] font-medium" :class="completed(item.plan.id, target.grade, target.className) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'" @click.stop="toggleCompletion(item.plan, target.grade, target.className)"><CheckCircle2 :size="11" class="mr-0.5 inline" />{{ completed(item.plan.id, target.grade, target.className) ? '已上课' : '标记已上课' }}</button></div></div></section>
          </div>
        </div>
      </article>
    </div>
    <details v-if="archivedUnits.length" class="mt-5 rounded-xl border border-slate-200 bg-white"><summary class="cursor-pointer px-4 py-3 text-sm font-medium text-slate-600">已归档课程（{{ archivedUnits.length }}）</summary><div class="border-t border-slate-100 p-3"><div v-for="item in archivedUnits" :key="item.unit.id" class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0"><span class="text-sm text-slate-700">{{ item.plan.topicTitle }} · {{ item.unit.targetGrades.join('、') }}</span><button type="button" class="rounded-lg border border-teal-200 px-2.5 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50" @click="restore(item.unit)">恢复到大盘</button></div></div></details>
  </section>
</template>
