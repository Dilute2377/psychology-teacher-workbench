<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BookOpenCheck, ChevronRight, FileBarChart2, MessageCircleMore, ShieldPlus, UsersRound } from '@lucide/vue'
import { db } from '../../db'
import type { CensusBatch, CensusResult, ConsultationRecord, GroupActivity, LessonRecord, WorkTrail } from '../../types/schema'

type TimelineItem = {
  id: string
  date: string
  type: 'consultation' | 'census' | 'group' | 'lesson' | 'work-trail'
  title: string
  subtitle: string
  tags: string[]
  consultation?: ConsultationRecord
  groupActivity?: GroupActivity
  lessonRecord?: LessonRecord
  workTrail?: WorkTrail
}

const props = defineProps<{ studentId: string; refreshKey?: number }>()
const emit = defineEmits<{ 'open-consultation': [record: ConsultationRecord]; 'open-group': [activity: GroupActivity]; 'open-work-trail': [record: WorkTrail]; 'start-lesson-consultation': [record: LessonRecord] }>()
const consultations = ref<ConsultationRecord[]>([])
const censusResults = ref<CensusResult[]>([])
const censusBatches = ref<CensusBatch[]>([])
const groupActivities = ref<GroupActivity[]>([])
const lessonRecords = ref<LessonRecord[]>([])
const workTrails = ref<WorkTrail[]>([])
const loading = ref(true)

const iconMap = { consultation: MessageCircleMore, census: FileBarChart2, group: UsersRound, lesson: BookOpenCheck, 'work-trail': ShieldPlus }
const labelMap = { consultation: '个体咨询', census: '心理普查', group: '团体辅导', lesson: '课堂观察', 'work-trail': '工作留痕' }
const visitLabels: Record<ConsultationRecord['visitType'], string> = { active: '主动来访', referral: '教师转介', census_followup: '普查约访' }

/**
 * 学生履历只从咨询、普查和团辅业务表实时合并；不使用任何独立事件副本，
 * 因而不会因写入顺序或学期筛选导致遗漏。
 */
const studentTimelineEvents = computed<TimelineItem[]>(() => {
  const batchById = new Map(censusBatches.value.map((batch) => [batch.id, batch]))
  const consultationEvents = consultations.value.map((record) => ({
    id: `consultation-${record.id}`,
    date: record.date,
    type: 'consultation' as const,
    title: `第 ${record.sessionIndex || 1} 次个体咨询`,
    subtitle: `${visitLabels[record.visitType]} · ${record.durationMinutes || 40}分钟`,
    tags: record.problemCategories ?? [],
    consultation: record,
  }))
  const censusEvents = censusResults.value.map((result) => {
    const batch = batchById.get(result.batchId)
    return {
      id: `census-${result.id}`,
      date: batch?.date ?? result.createdAt,
      type: 'census' as const,
      title: batch?.title ?? '心理普查测评',
      subtitle: result.isFlagged ? `触发预警: ${result.flaggedReasons.join('、') || '需复核'}` : '测评正常',
      tags: result.flaggedReasons ?? [],
    }
  })
  const groupEvents = groupActivities.value.map((activity) => ({
    id: `group-${activity.id}`,
    date: activity.date,
    type: 'group' as const,
    title: `团体辅导：${activity.title}`,
    subtitle: `第 ${activity.sessionIndex}/${activity.totalSessions} 期 · ${activity.theme}`,
    tags: [],
    groupActivity: activity,
  }))
  const lessonEvents = lessonRecords.value.map((record) => {
    const observation = record.notableStudents.find((student) => student.studentId === props.studentId)
    return { id: `lesson-${record.id}-${props.studentId}`, date: record.date, type: 'lesson' as const, title: `心理课课堂观察：${record.topic}`, subtitle: observation?.note || `${record.grade}${record.className} 心理课`, tags: [], lessonRecord: record }
  })
  const workTrailEvents = workTrails.value.map((record) => ({ id: `work-trail-${record.id}`, date: record.dateTime, type: 'work-trail' as const, title: `【${record.category === 'parent' ? '家长沟通' : record.category === 'teacher' ? '班主任协同' : record.category === 'leader' ? '领导指令' : record.category === 'handover' ? '任务交接' : record.category === 'subbing' ? '代课与杂务' : '危机免责'}】${record.title}`, subtitle: `与${record.stakeholderName} · ${record.content}`, tags: [], workTrail: record }))
  return [...consultationEvents, ...censusEvents, ...groupEvents, ...lessonEvents, ...workTrailEvents]
    .sort((a, b) => b.date.localeCompare(a.date))
})

async function loadTimeline() {
  loading.value = true
  const studentId = props.studentId
  const [allConsultations, allResults, allBatches, allGroups, allLessons, allWorkTrails] = await Promise.all([
    db.consultations.where('studentId').equals(studentId).toArray(),
    db.censusResults.where('studentId').equals(studentId).toArray(),
    db.censusBatches.toArray(),
    db.groupActivities.toArray(),
    db.lessonRecords.toArray(),
    db.workTrails.where('studentId').equals(studentId).toArray(),
  ])
  consultations.value = allConsultations
  censusResults.value = allResults
  censusBatches.value = allBatches
  groupActivities.value = allGroups.filter((activity) => activity.memberStudentIds.includes(studentId))
  lessonRecords.value = allLessons.filter((record) => record.notableStudents.some((student) => student.studentId === studentId))
  workTrails.value = allWorkTrails
  loading.value = false
}

watch(() => [props.studentId, props.refreshKey], () => void loadTimeline())
onMounted(loadTimeline)
</script>

<template>
  <div v-if="loading" class="py-12 text-center text-sm text-stone-400">正在载入服务履历…</div>
  <div v-else-if="studentTimelineEvents.length === 0" class="py-12 text-center text-sm text-stone-400">暂无心理服务与成长履历。</div>
  <ol v-else class="relative ml-3 border-l border-stone-200 pl-6">
    <li v-for="event in studentTimelineEvents" :key="event.id" class="relative pb-6 last:pb-0">
      <span class="absolute -left-[2.05rem] top-0.5 flex size-7 items-center justify-center rounded-full border-4 border-white bg-teal-100 text-teal-700"><component :is="iconMap[event.type]" :size="13" /></span>
      <div class="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1.5 py-0.5">
        <time class="text-xs tabular-nums text-stone-400">{{ event.date }}</time>
        <span class="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600"><component :is="iconMap[event.type]" :size="11" />{{ labelMap[event.type] }}</span>
        <p class="min-w-0 flex-1 text-sm font-medium text-stone-800">{{ event.title }}</p>
        <span class="w-full text-xs text-stone-500 sm:w-auto">{{ event.subtitle }}</span>
        <button v-if="event.consultation" class="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-teal-700 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600" type="button" @click="emit('open-consultation', event.consultation)">查看详情 <ChevronRight :size="14" /></button>
        <button v-else-if="event.groupActivity" class="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-teal-700 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600" type="button" @click="emit('open-group', event.groupActivity)">查看详情 <ChevronRight :size="14" /></button>
        <button v-else-if="event.workTrail" class="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-teal-700 hover:text-teal-900" type="button" @click="emit('open-work-trail', event.workTrail)">查看详情 <ChevronRight :size="14" /></button>
        <button v-else-if="event.lessonRecord" class="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-teal-700 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600" type="button" @click="emit('start-lesson-consultation', event.lessonRecord)">快捷约访 <ChevronRight :size="14" /></button>
      </div>
    </li>
  </ol>
</template>
