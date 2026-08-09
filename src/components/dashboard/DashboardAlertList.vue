<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { AlertTriangle, ArrowUpRight } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { studentService } from '../../services/studentService'
import { useTermStore } from '../../stores/useTermStore'
import { useWorkbenchStore } from '../../stores/workbench'
import { getStudentGrade } from '../../utils/academic'
import type { Student } from '../../types/schema'
import { useCrisisConfigStore } from '../../stores/useCrisisConfigStore'

const router = useRouter()
const termStore = useTermStore()
const workbench = useWorkbenchStore()
const crisisConfig = useCrisisConfigStore()
const students = ref<Student[]>([])
const badge = (student: Student) => crisisConfig.getStudentWarningBadge(student.warningLevel ?? student.riskLevel)
const alerts = computed(() => students.value.filter((student) => student.status === 'active' && crisisConfig.resolveLevelKey(student.warningLevel ?? student.riskLevel) !== 'normal').sort((a, b) => badge(b).weight - badge(a).weight))

async function load() { students.value = await studentService.list() }
function openStudent(student: Student) { workbench.selectedStudentId = student.id; router.push('/students') }
onMounted(() => { crisisConfig.load(); void load() })
watch([() => termStore.currentTermId, () => workbench.studentVersion], () => void load())
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="shrink-0 border-b border-stone-100 p-4"><div class="flex items-center gap-2"><span class="flex size-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><AlertTriangle :size="15" /></span><p class="text-sm font-semibold text-stone-800">高优先级学生</p></div></div>
    <div class="min-h-0 flex-1 overflow-y-auto p-3"><p v-if="alerts.length === 0" class="p-6 text-center text-sm leading-6 text-stone-400">当前没有需要优先处理的在读学生。</p><button v-for="student in alerts" v-else :key="student.id" type="button" class="mb-2 w-full rounded-xl border border-stone-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50" @click="openStudent(student)"><div class="flex items-start justify-between gap-2"><div><p class="text-sm font-semibold text-stone-800">{{ student.name }}</p><p class="mt-0.5 text-xs text-stone-500">{{ getStudentGrade(student, termStore.currentTerm) }}{{ student.className }}</p></div><ArrowUpRight :size="16" class="text-stone-400" /></div><span class="mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium" :style="{ backgroundColor: `${badge(student).color}18`, color: badge(student).color }">{{ badge(student).emoji }} {{ badge(student).label }}</span></button></div>
  </div>
</template>
