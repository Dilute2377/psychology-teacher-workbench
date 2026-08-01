<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { CalendarDays, ChevronRight, ClipboardPlus, FileBarChart2, MessageCircleMore, UsersRound } from '@lucide/vue'
import { studentService } from '../../services/studentService'
import type { TimelineEvent } from '../../types/schema'

const props = defineProps<{ studentId: string; refreshKey?: number }>()
const events = ref<TimelineEvent[]>([])
const loading = ref(true)
const iconMap = { consultation: ClipboardPlus, census: FileBarChart2, group: UsersRound, feedback: MessageCircleMore, lesson_note: CalendarDays }
const labelMap = { consultation: '个体咨询', census: '心理普查', group: '团体辅导', feedback: '日常反馈', lesson_note: '课堂观察' }

async function loadTimeline() { loading.value = true; events.value = await studentService.getTimeline(props.studentId); loading.value = false }
watch(() => [props.studentId, props.refreshKey], loadTimeline)
onMounted(loadTimeline)
</script>

<template>
  <div v-if="loading" class="py-12 text-center text-sm text-stone-400">正在载入服务履历…</div><div v-else-if="events.length === 0" class="py-12 text-center text-sm text-stone-400">暂无心理服务与成长履历。</div><ol v-else class="relative ml-3 border-l border-stone-200 pl-6"><li v-for="event in events" :key="event.id" class="relative pb-7 last:pb-0"><span class="absolute -left-[2.08rem] top-0 flex size-8 items-center justify-center rounded-full border-4 border-white bg-teal-100 text-teal-700"><component :is="iconMap[event.type]" :size="14" /></span><div class="rounded-xl border border-stone-200 bg-white p-3 shadow-sm"><div class="flex flex-wrap items-center justify-between gap-2"><span class="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">{{ labelMap[event.type] }}</span><time class="text-xs text-stone-400">{{ event.date }}</time></div><p class="mt-2 text-sm font-semibold text-stone-800">{{ event.title }}</p><p class="mt-1 text-sm leading-6 text-stone-600">{{ event.summary }}</p><button class="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-teal-700 hover:text-teal-900" type="button">查看详情 <ChevronRight :size="14" /></button></div></li></ol>
</template>
