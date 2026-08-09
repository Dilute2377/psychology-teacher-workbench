<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { AlertTriangle, ClipboardList, HeartPulse, UsersRound } from '@lucide/vue'
import { useOverviewStore } from '../stores/useOverviewStore'
import { useCrisisConfigStore } from '../stores/useCrisisConfigStore'
import { useTermStore } from '../stores/useTermStore'
import { useWorkbenchStore } from '../stores/workbench'
import ReportExportModal from '../components/report/ReportExportModal.vue'

const overview = useOverviewStore()
const termStore = useTermStore()
const workbench = useWorkbenchStore()
const crisisConfig = useCrisisConfigStore()
const isReportExportOpen = ref(false)
const warningMeta = computed(() => overview.riskDistribution.filter((item) => item.key !== 'normal'))
const formatPercent = (value: number) => value.toFixed(2)
const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN').format(value)

async function load() { await overview.load(termStore.currentTermId) }
onMounted(load)
watch([() => termStore.currentTermId, () => workbench.studentVersion], () => void load())
</script>

<template>
  <section class="flex h-full min-h-0 flex-col overflow-hidden">
    <header class="shrink-0 border-b border-stone-200 px-5 py-4"><div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-sm font-medium text-teal-700">{{ termStore.currentTerm?.name ?? '当前学期' }}</p><h1 class="mt-1 text-xl font-semibold text-stone-800">心理工作全景</h1><p class="mt-1 text-xs text-stone-400">动态危机分级 · 实时在册与历史累计双流统计</p></div><button type="button" class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700" @click="isReportExportOpen = true"><span class="text-base">📊</span><span>导出心理健康周/月报</span></button></div></header>
    <div class="min-h-0 flex-1 overflow-y-auto bg-stone-50/70 p-4"><div class="mx-auto max-w-6xl space-y-4">
      <div class="grid gap-3 md:grid-cols-3">
        <article class="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm"><div class="flex items-center justify-between"><span class="flex size-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><ClipboardList :size="19" /></span><span class="text-xs text-stone-400">本学期</span></div><p class="mt-3 text-3xl font-semibold tabular-nums text-stone-800">{{ formatNumber(overview.consultations.length) }}<span class="ml-1 text-sm font-medium text-stone-500">次</span></p><p class="mt-1 text-sm text-stone-500">本学期咨询总人次</p><p class="mt-2 text-xs text-stone-400">初访 {{ overview.firstVisitCount }} 人 <span class="mx-1">|</span> 复访 {{ overview.followUpCount }} 人次</p></article>
        <article class="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm"><div class="flex items-center justify-between"><span class="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle :size="19" /></span><span class="text-xs text-rose-500">实时 / 历史累计</span></div><p class="mt-3 text-3xl font-semibold tabular-nums text-stone-800">{{ overview.realtimeRiskStudentCount }}<span class="mx-1 text-lg font-normal text-stone-300">/</span>{{ overview.historicalRiskStudentCount }}<span class="ml-1 text-sm font-medium text-stone-500">人</span></p><p class="mt-1 text-sm text-stone-500">实时异常学生</p><div class="mt-2 flex flex-wrap gap-1.5"><span v-for="item in warningMeta" :key="item.key" class="rounded-full px-2 py-1 text-[11px] font-medium" :style="{ backgroundColor: `${item.color}18`, color: item.color }">{{ item.emoji }} {{ item.label }} {{ item.count }}人</span></div></article>
        <article class="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"><div class="flex items-center justify-between"><span class="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><UsersRound :size="19" /></span><span class="text-xs text-emerald-600">在读学生 · 健康率</span></div><p class="mt-3 text-3xl font-semibold tabular-nums text-stone-800">{{ formatNumber(overview.totalActiveStudents) }}<span class="ml-1 text-sm font-medium text-stone-500">人</span></p><p class="mt-1 text-sm text-stone-500">全校在读总人数</p><div class="mt-2 flex h-2 overflow-hidden rounded-full bg-rose-100" aria-label="正常学生和异常学生比例"><div class="bg-emerald-500 transition-all" :style="{ width: `${overview.normalRate}%` }" /><div class="bg-rose-400 transition-all" :style="{ width: `${overview.warningRate}%` }" /></div><p class="mt-1.5 text-[11px] leading-5 text-stone-500">🟢 {{ crisisConfig.levelLabels.normal_label }} {{ overview.normalStudentCount }} 人 ({{ formatPercent(overview.normalRate) }}%) · ⚠️ 非正常 {{ overview.realtimeRiskStudentCount }} 人 ({{ formatPercent(overview.warningRate) }}%)</p></article>
      </div>

      <div class="grid gap-4 lg:grid-cols-[1.05fr_1.4fr]">
        <article class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2"><HeartPulse :size="18" class="text-rose-600" /><h2 class="font-semibold text-stone-800">危机等级分布</h2></div>
            <span class="text-xs text-stone-400">在读学生实时状态</span>
          </div>
          <div class="mt-3 space-y-3">
            <div v-for="item in overview.riskDistribution" :key="item.key">
              <div class="mb-1 flex items-center justify-between gap-3 text-sm"><span class="min-w-0 truncate text-stone-600">{{ item.emoji }} {{ item.label }}</span><strong class="shrink-0 tabular-nums text-stone-800">{{ item.count }} 人 <span class="text-xs font-normal text-stone-400">({{ formatPercent(item.percentage) }}%)</span></strong></div>
              <div class="h-2 overflow-hidden rounded-full bg-stone-100"><div class="h-full rounded-full transition-all" :class="item.barClass" :style="{ width: `${item.percentage}%` }" /></div>
            </div>
          </div>
          <p class="mt-3 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5 text-xs leading-5 text-stone-500">当前口径：{{ crisisConfig.severityDirection === 'desc' ? '一级最高危' : '三级最高危' }}；恢复正常后实时人数下降，历史累计人数保留。</p>
        </article>
        <article class="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between"><h2 class="font-semibold text-stone-800">本学期主要问题归因</h2><span class="text-xs text-stone-400">按咨询记录统计</span></div>
          <div v-if="overview.categoryStats.length" class="mt-3 space-y-3">
            <div v-for="item in overview.categoryStats" :key="item.label">
              <div class="mb-1 flex items-center justify-between gap-3 text-sm"><span class="text-stone-600">{{ item.label }}</span><strong class="shrink-0 tabular-nums text-stone-800">{{ item.count }} 人次 <span class="text-xs font-normal text-stone-400">({{ formatPercent(item.percentage) }}%)</span></strong></div>
              <div class="h-2 overflow-hidden rounded-full bg-stone-100"><div class="h-full rounded-full bg-teal-600 transition-all" :style="{ width: `${(item.count / overview.maxCategoryCount) * 100}%` }" /></div>
            </div>
          </div>
          <div v-else class="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 px-6 text-center"><span class="flex size-10 items-center justify-center rounded-2xl bg-teal-50 text-xl">🗂️</span><p class="mt-2 text-sm font-medium text-stone-600">本学期暂无咨询分类归因数据</p><p class="mt-1 text-xs text-stone-400">完成咨询记录中的问题分类后，这里会自动形成聚合趋势。</p></div>
        </article>
      </div>
    </div></div>
  </section>
  <ReportExportModal v-if="isReportExportOpen" @close="isReportExportOpen = false" />
</template>
