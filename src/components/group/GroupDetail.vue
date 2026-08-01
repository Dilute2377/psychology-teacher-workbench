<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { MapPin, PencilLine, Trash2, UsersRound } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { studentService } from '../../services/studentService'
import { useGroupStore } from '../../stores/useGroupStore'
import { useTermStore } from '../../stores/useTermStore'
import { useWorkbenchStore } from '../../stores/workbench'
import { getStudentGrade } from '../../utils/academic'
import type { Student } from '../../types/schema'
import GroupFormDrawer from './GroupFormDrawer.vue'

const groupStore = useGroupStore(); const termStore = useTermStore(); const workbench = useWorkbenchStore(); const router = useRouter(); const students = ref<Student[]>([])
const activity = computed(() => groupStore.selectedGroup)
const members = computed(() => activity.value?.memberStudentIds.map((id) => students.value.find((student) => student.id === id)).filter((student): student is Student => Boolean(student)) ?? [])
async function loadStudents() { students.value = await studentService.list() }
function openStudent(id: string) { workbench.selectedStudentId = id; router.push('/students') }
async function remove() { if (!activity.value || !window.confirm(`确认删除“${activity.value.title}”吗？成员履历会同步移除该团辅节点。`)) return; await groupStore.deleteGroupActivity(activity.value.id) }
watch(() => workbench.studentVersion, () => void loadStudents()); onMounted(loadStudents)
</script>

<template><section v-if="!activity" class="flex h-full flex-col items-center justify-center p-8 text-center"><UsersRound :size="28" class="text-teal-700" /><h1 class="mt-3 text-lg font-semibold text-stone-800">团体辅导</h1><p class="mt-2 text-sm text-stone-500">从中间列表选择一条团辅记录，或新建活动。</p></section><section v-else class="flex h-full min-h-0 flex-col overflow-hidden"><header class="shrink-0 border-b border-stone-200 p-6"><div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-xs font-medium text-teal-700">{{ activity.theme }} · 第 {{ activity.sessionIndex }}/{{ activity.totalSessions }} 期</p><h1 class="mt-1 text-xl font-semibold text-stone-800">{{ activity.title }}</h1><p class="mt-2 text-sm text-stone-500">{{ activity.date }} · {{ activity.durationMinutes }}分钟 · <MapPin :size="13" class="inline" /> {{ activity.location }}</p></div><div class="flex gap-2"><button type="button" class="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm text-teal-700 hover:bg-teal-50" @click="groupStore.openForm(activity.id)"><PencilLine :size="15" />编辑</button><button type="button" class="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50" @click="remove"><Trash2 :size="15" />删除</button></div></div></header><div class="min-h-0 flex-1 overflow-y-auto bg-stone-50/50 p-6"><div class="mx-auto max-w-4xl space-y-5"><section class="rounded-2xl border border-stone-200 bg-white p-5"><h2 class="text-sm font-semibold text-stone-800">参与成员 <span class="ml-1 text-teal-700">{{ members.length }} 人</span></h2><div class="mt-3 flex flex-wrap gap-2"><button v-for="student in members" :key="student.id" type="button" class="rounded-full bg-teal-50 px-3 py-1.5 text-sm text-teal-800 hover:bg-teal-100" @click="openStudent(student.id)">{{ student.name }} · {{ getStudentGrade(student, termStore.currentTerm) }}{{ student.className }}</button></div></section><section class="rounded-2xl border border-stone-200 bg-white p-5"><h2 class="text-sm font-semibold text-stone-800">过程纪要</h2><p class="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-600">{{ activity.processSummary || '暂无过程纪要。' }}</p></section><section class="rounded-2xl border border-stone-200 bg-white p-5"><h2 class="text-sm font-semibold text-stone-800">成员个别观察</h2><div class="mt-3 grid gap-3 sm:grid-cols-2"><article v-for="student in members" :key="student.id" class="rounded-xl bg-stone-50 p-3"><p class="text-sm font-semibold text-stone-700">{{ student.name }}</p><p class="mt-1.5 text-sm leading-6 text-stone-600">{{ activity.memberObservations[student.id] || '未记录个别观察。' }}</p></article></div></section></div></div></section><GroupFormDrawer v-if="groupStore.isFormOpen" :editing-id="groupStore.editingGroupId" @saved="groupStore.fetchGroupActivities()" /></template>
