<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { AlertTriangle, ClipboardList, HeartPulse, Plus, ShieldAlert, UsersRound } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { OVERVIEW_RISK_META, useOverviewStore } from '../stores/useOverviewStore'
import { useConsultationStore } from '../stores/useConsultationStore'
import { useTermStore } from '../stores/useTermStore'
import { useWorkbenchStore } from '../stores/workbench'
import ReportExportModal from '../components/report/ReportExportModal.vue'

const overview = useOverviewStore()
const termStore = useTermStore()
const workbench = useWorkbenchStore()
const consultationStore = useConsultationStore()
const router = useRouter()
const isReportExportOpen = ref(false)
const warningMeta = OVERVIEW_RISK_META.filter((item) => item.key !== 'normal')

const todoItems = computed(() => [
  { title: '一级预警即时研判', count: overview.riskCounts.level_1, hint: '建议当日完成风险复核与支持安排', tone: 'rose' },
  { title: '二级预警重点跟踪', count: overview.riskCounts.level_2, hint: '建议纳入本周重点关注清单', tone: 'orange' },
  { title: '三级预警一般关注', count: overview.riskCounts.level_3, hint: '建议持续观察适应与情绪变化', tone: 'amber' },
])
const formatPercent = (value: number) => value.toFixed(2)
const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN').format(value)

async function load() { await overview.load(termStore.currentTermId) }
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
    <header class="shrink-0 border-b border-stone-200 p-6"><div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-sm font-medium text-teal-700">{{ termStore.currentTerm?.name ?? '当前学期' }}</p><h1 class="mt-1 text-xl font-semibold text-stone-800">心理工作全景</h1><p class="mt-1 text-xs text-stone-400">国家三级心理危机预警 · 实时在册与历史累计双流统计</p></div><div class="flex flex-wrap items-center gap-2"><button type="button" class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700" @click="isReportExportOpen = true"><span class="text-base">📊</span><span>导出心理健康周/月报</span></button><button type="button" class="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800" @click="startConsultation"><Plus :size="16" />快捷记录咨询</button></div></div></header>
    <div class="min-h-0 flex-1 overflow-y-auto bg-stone-50/70 p-6"><div class="mx-auto max-w-6xl space-y-6">
      <div class="grid gap-4 md:grid-cols-3">
        <article class="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><span class="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><ClipboardList :size="20" /></span><span class="text-xs text-stone-400">本学期</span></div><p class="mt-5 text-3xl font-semibold tabular-nums text-stone-800">{{ formatNumber(overview.consultations.length) }}<span class="ml-1 text-sm font-medium text-stone-500">次</span></p><p class="mt-1 text-sm text-stone-500">本学期咨询总人次</p><p class="mt-3 text-xs text-stone-400">初访 {{ overview.firstVisitCount }} 人 <span class="mx-1">|</span> 复访 {{ overview.followUpCount }} 人次</p></article>
        <article class="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><span class="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle :size="20" /></span><span class="text-xs text-rose-500">实时 / 历史累计</span></div><p class="mt-5 text-3xl font-semibold tabular-nums text-stone-800">{{ overview.realtimeRiskStudentCount }}<span class="mx-1 text-lg font-normal text-stone-300">/</span>{{ overview.historicalRiskStudentCount }}<span class="ml-1 text-sm font-medium text-stone-500">人</span></p><p class="mt-1 text-sm text-stone-500">需关注 / 危机学生</p><div class="mt-3 flex flex-wrap gap-1.5"><span v-for="item in warningMeta" :key="item.key" class="rounded-full px-2 py-1 text-[11px] font-medium" :style="{ backgroundColor: `${item.color}18`, color: item.color }">{{ item.key === 'level_1' ? '🔴' : item.key === 'level_2' ? '🟠' : '🟡' }} {{ item.shortLabel }} {{ overview.riskCounts[item.key] }}人</span></div></article>
        <article class="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><span class="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><UsersRound :size="20" /></span><span class="text-xs text-emerald-600">在读学生 · 健康率</span></div><p class="mt-5 text-3xl font-semibold tabular-nums text-stone-800">{{ formatNumber(overview.totalActiveStudents) }}<span class="ml-1 text-sm font-medium text-stone-500">人</span></p><p class="mt-1 text-sm text-stone-500">全校在读总人数</p><div class="mt-3 flex h-2 overflow-hidden rounded-full bg-rose-100" aria-label="正常学生和预警学生比例"><div class="bg-emerald-500 transition-all" :style="{ width: `${overview.normalRate}%` }" /><div class="bg-rose-400 transition-all" :style="{ width: `${overview.warningRate}%` }" /></div><p class="mt-2 text-[11px] leading-5 text-stone-500">🟢 正常 {{ overview.normalStudentCount }} 人 ({{ formatPercent(overview.normalRate) }}%) · ⚠️ 预警关注 {{ overview.realtimeRiskStudentCount }} 人 ({{ formatPercent(overview.warningRate) }}%)</p></article>
      </div>

      <div class="grid gap-6 lg:grid-cols-[1.05fr_1.4fr]">
        <article class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><div class="flex items-center gap-2"><HeartPulse :size="18" class="text-rose-600" /><h2 class="font-semibold text-stone-800">危机预警分布</h2></div><span class="text-xs text-stone-400">在读学生实时状态</span></div><div class="mt-5 space-y-5"><div v-for="item in overview.riskDistribution" :key="item.key"><div class="mb-1.5 flex items-center justify-between gap-3 text-sm"><span class="min-w-0 truncate text-stone-600">{{ item.key === 'level_1' ? '🔴' : item.key === 'level_2' ? '🟠' : item.key === 'level_3' ? '🟡' : '🟢' }} {{ item.label }}</span><strong class="shrink-0 tabular-nums text-stone-800">{{ item.count }} 人 <span class="text-xs font-normal text-stone-400">({{ formatPercent(item.percentage) }}%)</span></strong></div><div class="h-2.5 overflow-hidden rounded-full bg-stone-100"><div class="h-full rounded-full transition-all" :class="item.barClass" :style="{ width: `${item.percentage}%` }" /></div></div></div><p class="mt-5 rounded-xl border border-stone-100 bg-stone-50 px-3 py-3 text-xs leading-5 text-stone-500">三级预警口径：一级为危机，二级为重点关注，三级为一般关注；恢复正常后实时人数下降，历史累计人数保留。</p></article>
        <article class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><h2 class="font-semibold text-stone-800">本学期主要问题归因</h2><span class="text-xs text-stone-400">按咨询记录统计</span></div><div v-if="overview.categoryStats.length" class="mt-5 space-y-4"><div v-for="item in overview.categoryStats" :key="item.label"><div class="mb-1.5 flex items-center justify-between gap-3 text-sm"><span class="text-stone-600">{{ item.label }}</span><strong class="shrink-0 tabular-nums text-stone-800">{{ item.count }} 人次 <span class="text-xs font-normal text-stone-400">({{ formatPercent(item.percentage) }}%)</span></strong></div><div class="h-2.5 overflow-hidden rounded-full bg-stone-100"><div class="h-full rounded-full bg-teal-600 transition-all" :style="{ width: `${(item.count / overview.maxCategoryCount) * 100}%` }" /></div></div></div><div v-else class="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 px-6 text-center"><span class="flex size-11 items-center justify-center rounded-2xl bg-teal-50 text-xl">🗂️</span><p class="mt-3 text-sm font-medium text-stone-600">本学期暂无咨询分类归因数据</p><p class="mt-1 text-xs text-stone-400">完成咨询记录中的问题分类后，这里会自动形成聚合趋势。</p></div></article>
      </div>

      <article class="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm"><div class="flex items-center justify-between"><div class="flex items-center gap-2"><ShieldAlert :size="18" class="text-amber-600" /><h2 class="font-semibold text-stone-800">待办与预警提醒</h2></div><span class="text-xs text-stone-400">按当前在册状态提示</span></div><div class="mt-4 grid gap-3 md:grid-cols-3"><div v-for="item in todoItems" :key="item.title" class="flex items-start gap-3 rounded-xl border p-3" :class="item.tone === 'rose' ? 'border-rose-100 bg-rose-50/60' : item.tone === 'orange' ? 'border-orange-100 bg-orange-50/60' : 'border-amber-100 bg-amber-50/60'"><span class="mt-0.5 size-2.5 shrink-0 rounded-full" :class="item.tone === 'rose' ? 'bg-rose-500' : item.tone === 'orange' ? 'bg-orange-400' : 'bg-amber-400'" /><div><p class="text-sm font-medium text-stone-700">{{ item.title }} <strong class="ml-1 tabular-nums">{{ item.count }} 人</strong></p><p class="mt-1 text-xs leading-5 text-stone-500">{{ item.hint }}</p></div></div></div></article>
    </div></div>
  </section>
  <ReportExportModal v-if="isReportExportOpen" @close="isReportExportOpen = false" />
</template>
