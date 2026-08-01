<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { AlertTriangle, ClipboardList, HeartPulse, Plus, UsersRound } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { db } from '../db'
import { getConsultationCategoryLabel, useConsultationStore } from '../stores/useConsultationStore'
import { useTermStore } from '../stores/useTermStore'
import { useWorkbenchStore } from '../stores/workbench'
import type { ConsultationRecord, RiskLevel, Student } from '../types/schema'

const termStore = useTermStore()
const workbench = useWorkbenchStore()
const consultationStore = useConsultationStore()
const router = useRouter()
const students = ref<Student[]>([])
const consultations = ref<ConsultationRecord[]>([])
const riskOrder: RiskLevel[] = ['crisis', 'warning', 'attention']
const riskLabels: Record<RiskLevel, string> = { normal: '正常', attention: '关注', warning: '重点关注', crisis: '危机预警' }

const activeStudents = computed(() => students.value.filter((student) => student.status === 'active'))
const riskCounts = computed(() => Object.fromEntries(riskOrder.map((level) => [level, activeStudents.value.filter((student) => student.riskLevel === level).length])) as Record<RiskLevel, number>)
const categoryStats = computed(() => {
  const counts = new Map<string, number>()
  consultations.value.forEach((record) => record.problemCategories.forEach((category) => { const label = getConsultationCategoryLabel(category); counts.set(label, (counts.get(label) ?? 0) + 1) }))
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
})
const maxCategoryCount = computed(() => Math.max(1, ...categoryStats.value.map((item) => item.count)))

async function load() {
  const termId = termStore.currentTermId
  const [allStudents, allConsultations] = await Promise.all([db.students.toArray(), db.consultations.toArray()])
  students.value = allStudents
  consultations.value = termId ? allConsultations.filter((record) => record.termId === termId) : []
}
function startConsultation() {
  workbench.pendingConsultationStudentId = workbench.selectedStudentId
  consultationStore.openForm()
  router.push('/consultations')
}
onMounted(load)
watch([() => termStore.currentTermId, () => workbench.studentVersion], () => void load())
</script>

<template>
  <section class="flex h-full min-h-0 flex-col overflow-hidden">
    <header class="shrink-0 border-b border-stone-200 p-6"><div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-sm font-medium text-teal-700">{{ termStore.currentTerm?.name ?? '当前学期' }}</p><h1 class="mt-1 text-xl font-semibold text-stone-800">心理工作全景</h1></div><button type="button" class="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800" @click="startConsultation"><Plus :size="16" />快捷记录咨询</button></div></header>
    <div class="min-h-0 flex-1 overflow-y-auto bg-stone-50/70 p-6"><div class="mx-auto max-w-6xl space-y-6"><div class="grid gap-4 md:grid-cols-3"><article class="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><span class="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><ClipboardList :size="20" /></span><span class="text-xs text-stone-400">本学期</span></div><p class="mt-5 text-3xl font-semibold text-stone-800">{{ consultations.length }}</p><p class="mt-1 text-sm text-stone-500">咨询总人次</p></article><article class="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><span class="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle :size="20" /></span><span class="text-xs text-rose-500">优先关注</span></div><p class="mt-5 text-3xl font-semibold text-stone-800">{{ riskCounts.crisis + riskCounts.warning }}</p><p class="mt-1 text-sm text-stone-500">危机预警与重点关注学生</p></article><article class="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><span class="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><UsersRound :size="20" /></span><span class="text-xs text-stone-400">在读学生</span></div><p class="mt-5 text-3xl font-semibold text-stone-800">{{ activeStudents.length }}</p><p class="mt-1 text-sm text-stone-500">其中 {{ riskCounts.attention }} 人处于关注等级</p></article></div><div class="grid gap-6 lg:grid-cols-[1.05fr_1.4fr]"><article class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div class="flex items-center gap-2"><HeartPulse :size="18" class="text-rose-600" /><h2 class="font-semibold text-stone-800">危机预警分布</h2></div><div class="mt-5 space-y-4"><div v-for="level in riskOrder" :key="level"><div class="mb-1.5 flex justify-between text-sm"><span class="text-stone-600">{{ riskLabels[level] }}</span><strong class="text-stone-800">{{ riskCounts[level] }} 人</strong></div><div class="h-2 overflow-hidden rounded-full bg-stone-100"><div class="h-full rounded-full" :class="level === 'crisis' ? 'bg-rose-500' : level === 'warning' ? 'bg-orange-500' : 'bg-amber-400'" :style="{ width: `${activeStudents.length ? (riskCounts[level] / activeStudents.length) * 100 : 0}%` }" /></div></div></div></article><article class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><h2 class="font-semibold text-stone-800">本学期主要问题归因</h2><span class="text-xs text-stone-400">按咨询记录统计</span></div><p v-if="categoryStats.length === 0" class="py-12 text-center text-sm text-stone-400">本学期尚无咨询分类数据。</p><div v-else class="mt-5 space-y-4"><div v-for="item in categoryStats" :key="item.label"><div class="mb-1.5 flex justify-between text-sm"><span class="text-stone-600">{{ item.label }}</span><strong class="text-stone-800">{{ item.count }} 例</strong></div><div class="h-2.5 overflow-hidden rounded-full bg-stone-100"><div class="h-full rounded-full bg-teal-600" :style="{ width: `${(item.count / maxCategoryCount) * 100}%` }" /></div></div></div></article></div></div></div>
  </section>
</template>
