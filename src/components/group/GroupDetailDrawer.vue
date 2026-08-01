<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { MapPin, X } from '@lucide/vue'
import { studentService } from '../../services/studentService'
import { useTermStore } from '../../stores/useTermStore'
import { getStudentGrade } from '../../utils/academic'
import type { GroupActivity, Student } from '../../types/schema'

const props = defineProps<{ activity: GroupActivity; focusedStudentId?: string }>()
const emit = defineEmits<{ close: [] }>()
const termStore = useTermStore(); const students = ref<Student[]>([])
onMounted(async () => { students.value = await studentService.list() })
const member = (id: string) => students.value.find((student) => student.id === id)
</script>

<template><Teleport to="body"><div class="fixed inset-0 z-50 bg-stone-950/30" @click.self="emit('close')"><section class="ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white p-6 shadow-2xl"><header class="flex items-start justify-between gap-4"><div><p class="text-xs font-medium text-teal-700">团体辅导 · 第 {{ activity.sessionIndex }}/{{ activity.totalSessions }} 期</p><h2 class="mt-1 text-xl font-semibold text-stone-800">{{ activity.title }}</h2><p class="mt-2 text-sm text-stone-500">{{ activity.date }} · {{ activity.durationMinutes }}分钟 · <MapPin :size="13" class="inline" /> {{ activity.location }}</p></div><button type="button" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" @click="emit('close')"><X :size="18" /></button></header><section class="mt-6"><h3 class="text-sm font-semibold text-stone-800">过程纪要</h3><p class="mt-2 whitespace-pre-wrap rounded-xl bg-stone-50 p-4 text-sm leading-7 text-stone-600">{{ activity.processSummary || '暂无过程纪要。' }}</p></section><section class="mt-6"><h3 class="text-sm font-semibold text-stone-800">成员观察</h3><div class="mt-3 space-y-2"><article v-for="id in activity.memberStudentIds" :key="id" class="rounded-xl border p-3" :class="focusedStudentId === id ? 'border-teal-300 bg-teal-50' : 'border-stone-100'"><p class="text-sm font-semibold text-stone-700">{{ member(id)?.name ?? '未关联学生' }} <span class="text-xs font-normal text-stone-400">{{ member(id) ? `${getStudentGrade(member(id)!, termStore.currentTerm)}${member(id)?.className}` : '' }}</span></p><p class="mt-1.5 text-sm leading-6 text-stone-600">{{ activity.memberObservations[id] || '未记录个别观察。' }}</p></article></div></section></section></div></Teleport></template>
