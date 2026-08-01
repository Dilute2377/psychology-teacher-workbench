<script setup lang="ts">
import { computed } from 'vue'
import { Check, Pencil, Plus, RotateCcw } from '@lucide/vue'
import { useSchoolConfigStore } from '../../stores/useSchoolConfigStore'
import { useTeachingStore } from '../../stores/useTeachingStore'
import type { ScheduleFrequency, WeeklySchedule } from '../../types/schema'

const props = defineProps<{ view: 'all' | 'single' | 'double' }>()
const emit = defineEmits<{ configure: [schedule: WeeklySchedule | null, dayOfWeek: number, period: number, frequency: ScheduleFrequency, planId?: string]; open: [schedule: WeeklySchedule]; 'update:view': [view: 'all' | 'single' | 'double'] }>()
const teachingStore = useTeachingStore(); const schoolConfig = useSchoolConfigStore()
const weekdays = [{ id: 1, label: '周一' }, { id: 2, label: '周二' }, { id: 3, label: '周三' }, { id: 4, label: '周四' }, { id: 5, label: '周五' }]
const editable = computed(() => props.view !== 'all')
const defaultFrequency = computed<ScheduleFrequency>(() => props.view === 'single' ? 'single' : 'double')
function visible(schedule: WeeklySchedule) { return props.view === 'all' || schedule.frequency === 'weekly' || schedule.frequency === props.view }
function allAt(dayOfWeek: number, period: number) { return teachingStore.weeklySchedules.filter((schedule) => schedule.dayOfWeek === dayOfWeek && schedule.period === period) }
function schedulesAt(dayOfWeek: number, period: number) { return allAt(dayOfWeek, period).filter(visible).sort((a, b) => a.frequency.localeCompare(b.frequency)) }
function canAdd(dayOfWeek: number, period: number) { return editable.value && !allAt(dayOfWeek, period).some((schedule) => schedule.frequency === 'weekly' || schedule.frequency === defaultFrequency.value) }
function frequencyLabel(schedule: WeeklySchedule) { return schedule.frequency === 'single' ? '单周' : schedule.frequency === 'double' ? '双周' : '每周' }
function draggedPlanId(event: DragEvent) { return event.dataTransfer?.getData('application/x-lesson-plan') || event.dataTransfer?.getData('text/plain') || '' }
function dropPlan(event: DragEvent, dayOfWeek: number, period: number) { const planId = draggedPlanId(event); if (!editable.value || !planId || !teachingStore.planById.has(planId) || !canAdd(dayOfWeek, period)) return; emit('configure', null, dayOfWeek, period, defaultFrequency.value, planId) }
async function complete(schedule: WeeklySchedule) { await teachingStore.completeSchedule(schedule.id) }
async function undo(schedule: WeeklySchedule) { await teachingStore.undoCompleteSchedule(schedule.id) }
</script>

<template>
  <section>
    <div class="overflow-x-auto rounded-xl border border-stone-200 bg-white">
      <table class="w-full min-w-[660px] table-fixed border-collapse text-[11px]">
        <thead><tr class="bg-stone-50"><th class="w-24 border-b border-r border-stone-200 px-1.5 py-1.5 text-left font-semibold text-stone-500">课时</th><th v-for="day in weekdays" :key="day.id" class="border-b border-r border-stone-200 px-1.5 py-1.5 text-center font-semibold text-stone-500">{{ day.label }}</th></tr></thead>
        <tbody>
          <tr v-for="(period, index) in schoolConfig.teachingProfile.periods" :key="period.label">
            <th class="h-11 border-b border-r border-stone-200 bg-stone-50/60 px-1.5 py-1 text-left"><p class="font-semibold text-stone-700">{{ period.label }}</p><p class="text-[9px] font-normal text-stone-400">{{ period.start || '--:--' }}–{{ period.end || '--:--' }}</p></th>
            <td v-for="day in weekdays" :key="`${index + 1}-${day.id}`" class="h-11 border-b border-r border-stone-200 p-0.5 align-top" @dragover.prevent @drop.prevent="dropPlan($event, day.id, index + 1)">
              <div v-if="schedulesAt(day.id, index + 1).length" class="space-y-0.5">
                <article v-for="schedule in schedulesAt(day.id, index + 1)" :key="schedule.id" class="rounded px-1 py-0.5 text-left" :class="schedule.status === 'completed' ? 'bg-emerald-50 text-emerald-800 line-through decoration-emerald-300' : schedule.lessonPlanId ? schedule.frequency === 'double' ? 'bg-violet-50 text-violet-900' : schedule.frequency === 'single' ? 'bg-sky-50 text-sky-900' : 'bg-teal-50 text-teal-900' : 'bg-stone-100 text-stone-700'">
                  <div class="flex min-w-0 items-center gap-1"><span class="truncate font-semibold">{{ schedule.grade }}{{ schedule.className }}</span><span v-if="schedule.lessonPlanId" class="truncate">· {{ teachingStore.planById.get(schedule.lessonPlanId)?.topicTitle || '教案已删除' }}</span></div>
                  <div class="flex items-center gap-1 text-[9px] no-underline"><span class="rounded bg-white/70 px-1">{{ frequencyLabel(schedule) }}</span><template v-if="editable"><button type="button" class="rounded bg-white/80 px-1 hover:bg-white" title="更换教案、班级或清除整条排课" @click.stop="emit('configure', schedule, schedule.dayOfWeek, schedule.period, schedule.frequency)"><Pencil :size="9" /></button><button v-if="schedule.lessonPlanId && schedule.status !== 'completed'" type="button" class="rounded bg-emerald-600 px-1 text-white hover:bg-emerald-700" title="结课打勾" @click.stop="complete(schedule)"><Check :size="9" /></button><button v-else-if="schedule.status === 'completed'" type="button" class="rounded bg-white/80 px-1 hover:bg-white" title="撤销结课" @click.stop="undo(schedule)"><RotateCcw :size="9" /></button></template></div>
                </article>
              </div>
              <button v-if="canAdd(day.id, index + 1)" type="button" class="flex h-full min-h-9 w-full items-center justify-center rounded border border-dashed border-stone-200 text-stone-400 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700" title="新增课时" @click.stop="emit('configure', null, day.id, index + 1, defaultFrequency)"><Plus :size="13" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
