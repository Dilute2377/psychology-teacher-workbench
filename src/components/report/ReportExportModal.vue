<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { X } from '@lucide/vue'
import { buildReportData, getReportRange, type ReportData, type ReportPeriod } from '../../services/reportService'

const emit = defineEmits<{ close: [] }>()

const period = ref<ReportPeriod>('month')
const initialRange = getReportRange('month')
const customStart = ref(initialRange.start)
const customEnd = ref(initialRange.end)
const report = ref<ReportData>()
const loading = ref(false)
const error = ref('')
let requestId = 0

const riskMax = computed(() => Math.max(1, ...(report.value?.riskDistribution.map((item) => item.count) ?? [1])))
const concernMax = computed(() => Math.max(1, ...(report.value?.concernDistribution.map((item) => item.count) ?? [1])))
const trendMax = computed(() => Math.max(1, ...(report.value?.trend.flatMap((item) => [item.consultations, item.risks]) ?? [1])))
const trendLabelStep = computed(() => Math.max(1, Math.ceil((report.value?.trend.length ?? 1) / 6)))
const donutSegments = computed(() => {
  const values = report.value?.gradeDistribution ?? []
  const total = Math.max(1, values.reduce((sum, item) => sum + item.count, 0))
  const circumference = 2 * Math.PI * 52
  let offset = 0
  return values.map((item) => {
    const length = circumference * (item.count / total)
    const segment = { ...item, length, gap: circumference - length, offset }
    offset += length
    return segment
  })
})

function barHeight(value: number, max: number, height = 108) { return value ? Math.max(4, (value / max) * height) : 2 }
function concernWidth(value: number, max: number) { return value ? Math.max(6, (value / max) * 156) : 2 }
function chartPoints(key: 'consultations' | 'risks') {
  const values = report.value?.trend ?? []
  const max = trendMax.value
  return values.map((item, index) => `${12 + (index / Math.max(1, values.length - 1)) * 496},${180 - (item[key] / max) * 144}`).join(' ')
}
function setPeriod(next: ReportPeriod) {
  period.value = next
  if (next !== 'custom') {
    const range = getReportRange(next)
    customStart.value = range.start
    customEnd.value = range.end
  }
}
async function loadReport() {
  const currentRequest = ++requestId
  loading.value = true
  error.value = ''
  try {
    const data = await buildReportData(period.value, customStart.value, customEnd.value)
    if (currentRequest === requestId) report.value = data
  } catch (reason) {
    if (currentRequest === requestId) error.value = reason instanceof Error ? reason.message : '报告数据读取失败，请重试。'
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}
function handlePrint() { window.print() }
function handleKeydown(event: KeyboardEvent) { if (event.key === 'Escape') emit('close') }

watch([period, customStart, customEnd], () => { void loadReport() })
onMounted(() => { window.addEventListener('keydown', handleKeydown); void loadReport() })
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="report-export-modal fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 sm:p-8" @click.self="emit('close')">
      <section class="w-full max-w-[1100px] overflow-hidden rounded-xl bg-slate-900 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="report-export-title">
        <div class="flex flex-wrap items-center justify-between gap-4 bg-slate-900 px-6 py-4 text-white print:hidden">
          <div class="flex flex-wrap items-center gap-4">
            <h3 id="report-export-title" class="flex items-center gap-2 text-base font-bold"><span>📊</span>心理健康服务与态势报告生成器</h3>
            <div class="flex rounded-lg border border-slate-700 bg-slate-800 p-1 text-xs font-medium">
              <button type="button" class="rounded-md px-3 py-1 transition-all" :class="period === 'week' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'" @click="setPeriod('week')">本周报表</button>
              <button type="button" class="rounded-md px-3 py-1 transition-all" :class="period === 'month' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'" @click="setPeriod('month')">本月报表</button>
              <button type="button" class="rounded-md px-3 py-1 transition-all" :class="period === 'custom' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'" @click="setPeriod('custom')">自定义时间段</button>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button type="button" class="flex items-center gap-1.5 rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-emerald-600" @click="handlePrint"><span>🖨️</span>打印 / 另存为 PDF</button>
            <button type="button" class="px-2 text-lg text-slate-400 hover:text-white" aria-label="关闭报告生成器" @click="emit('close')"><X :size="19" /></button>
          </div>
        </div>

        <div v-if="period === 'custom'" class="flex flex-wrap items-end gap-3 border-t border-slate-800 bg-slate-900 px-6 pb-4 text-xs text-slate-300 print:hidden">
          <label>开始日期<input v-model="customStart" type="date" class="ml-2 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-slate-100" /></label>
          <span class="pb-1.5 text-slate-500">至</span>
          <label>结束日期<input v-model="customEnd" type="date" class="ml-2 rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-slate-100" /></label>
        </div>

        <main id="report-canvas" class="report-paper mx-auto max-w-[794px] bg-white p-8 text-slate-800">
          <div v-if="loading" class="flex min-h-[620px] items-center justify-center text-sm text-slate-400">正在汇总本地数据…</div>
          <div v-else-if="error" class="flex min-h-[620px] flex-col items-center justify-center gap-3 text-center"><p class="text-sm text-rose-600">{{ error }}</p><button type="button" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white" @click="loadReport">重试</button></div>
          <template v-else-if="report">
            <header class="flex items-start justify-between gap-6 border-b border-slate-200 pb-5 print-no-break">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">{{ report.schoolName }}</p>
                <h1 class="mt-2 text-[22px] font-bold leading-tight tracking-tight text-slate-800">心理健康服务与危机态势统计报告</h1>
                <p class="mt-2 text-xs text-slate-500">聚合数据简报 · 仅供校内工作研判使用</p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-sm font-semibold tabular-nums text-slate-700">{{ report.rangeLabel }}</p>
                <span class="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">🔒 内部资料 · 数据已严格脱敏</span>
              </div>
            </header>

            <section class="mt-6 print-no-break">
              <div class="mb-3 flex items-center justify-between"><h2 class="text-sm font-bold text-slate-800">01 · 核心服务指标</h2><span class="text-[11px] text-slate-400">按所选时间段聚合</span></div>
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <article class="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3"><p class="text-[11px] font-medium text-emerald-700">咨询总人次</p><p class="mt-2 text-2xl font-bold tabular-nums text-slate-800">{{ report.consultationCount }}<span class="ml-1 text-xs font-medium text-slate-500">次</span></p><p class="mt-1 text-[10px] text-slate-500">初访 {{ report.firstVisitCount }} 人 · 复访 {{ report.followUpCount }} 人</p></article>
                <article class="rounded-xl border border-rose-100 bg-rose-50/70 p-3"><p class="text-[11px] font-medium text-rose-700">危机预警在册</p><p class="mt-2 text-2xl font-bold tabular-nums text-slate-800">{{ report.activeRiskCount }}<span class="ml-1 text-xs font-medium text-slate-500">人</span></p><p class="mt-1 text-[10px] text-slate-500">红 / 橙 {{ report.highRiskCount }} 人 · 黄 {{ report.attentionRiskCount }} 人</p></article>
                <article class="rounded-xl border border-sky-100 bg-sky-50/70 p-3"><p class="text-[11px] font-medium text-sky-700">家校 / 协同留痕</p><p class="mt-2 text-2xl font-bold tabular-nums text-slate-800">{{ report.collaborationCount }}<span class="ml-1 text-xs font-medium text-slate-500">次</span></p><p class="mt-1 text-[10px] text-slate-500">家长 {{ report.parentTrailCount }} · 领导 {{ report.leaderTrailCount }}</p></article>
                <article class="rounded-xl border border-amber-100 bg-amber-50/70 p-3"><p class="text-[11px] font-medium text-amber-700">结案 / 转介成效</p><p class="mt-2 text-2xl font-bold tabular-nums text-slate-800">{{ report.closedCount }}<span class="ml-1 text-xs font-medium text-slate-500">人</span></p><p class="mt-1 text-[10px] text-slate-500">好转结案 · 转介 {{ report.referralCount }} 人</p></article>
              </div>
            </section>

            <section class="mt-7 print-no-break">
              <div class="mb-3 flex items-center justify-between"><h2 class="text-sm font-bold text-slate-800">02 · 服务需求与风险趋势</h2><span class="text-[11px] text-slate-400">不显示任何学生身份信息</span></div>
              <div class="grid gap-4 sm:grid-cols-2">
                <article class="rounded-xl border border-slate-200 bg-slate-50/60 p-4"><h3 class="text-xs font-semibold text-slate-700">预警等级与问题类型分布</h3><div class="mt-3 grid grid-cols-2 gap-2"><div><p class="mb-1 text-[10px] text-slate-400">当前在册等级</p><svg viewBox="0 0 230 160" class="h-[150px] w-full" role="img" aria-label="当前预警等级柱状图"><line x1="10" y1="128" x2="220" y2="128" stroke="#cbd5e1" /><g v-for="(item, index) in report.riskDistribution" :key="item.key"><rect :x="16 + index * 51" :y="128 - barHeight(item.count, riskMax)" width="30" :height="barHeight(item.count, riskMax)" rx="5" :fill="item.color" /><text :x="31 + index * 51" :y="120 - barHeight(item.count, riskMax)" text-anchor="middle" font-size="11" font-weight="700" fill="#334155">{{ item.count }}</text><text :x="31 + index * 51" y="143" text-anchor="middle" font-size="8" fill="#64748b">{{ item.label.slice(0, 2) }}</text></g></svg></div><div><p class="mb-1 text-[10px] text-slate-400">主要困扰分类</p><svg viewBox="0 0 220 160" class="h-[150px] w-full" role="img" aria-label="主要困扰分类柱状图"><g v-for="(item, index) in report.concernDistribution" :key="item.label"><text x="0" :y="18 + index * 26" font-size="9" fill="#475569">{{ item.label.slice(0, 5) }}</text><rect x="55" :y="8 + index * 26" :width="concernWidth(item.count, concernMax)" height="14" rx="4" fill="#73a78f" /><text x="218" :y="19 + index * 26" text-anchor="end" font-size="9" font-weight="700" fill="#475569">{{ item.count }}</text></g><text v-if="!report.concernDistribution.length" x="110" y="78" text-anchor="middle" font-size="10" fill="#94a3b8">暂无分类数据</text></svg></div></div></article>
                <article class="rounded-xl border border-slate-200 bg-slate-50/60 p-4"><div class="flex items-start justify-between"><h3 class="text-xs font-semibold text-slate-700">心理服务需求与危机趋势走向</h3><div class="flex gap-2 text-[10px] text-slate-500"><span><i class="mr-1 inline-block size-2 rounded-full bg-emerald-500" />咨询需求</span><span><i class="mr-1 inline-block size-2 rounded-full bg-rose-400" />危机预警</span></div></div><svg viewBox="0 0 520 210" class="mt-3 h-[155px] w-full" role="img" aria-label="心理服务需求与危机趋势折线图"><line x1="12" y1="180" x2="508" y2="180" stroke="#cbd5e1" /><line x1="12" y1="36" x2="12" y2="180" stroke="#cbd5e1" /><line x1="12" y1="108" x2="508" y2="108" stroke="#e2e8f0" stroke-dasharray="3 4" /><polyline :points="chartPoints('consultations')" fill="none" stroke="#2f9569" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /><polyline :points="chartPoints('risks')" fill="none" stroke="#df6871" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /><g v-for="(item, index) in report.trend" :key="`${item.label}-${index}`"><circle :cx="12 + (index / Math.max(1, report.trend.length - 1)) * 496" :cy="180 - (item.consultations / trendMax) * 144" r="3.5" fill="#2f9569" /><circle :cx="12 + (index / Math.max(1, report.trend.length - 1)) * 496" :cy="180 - (item.risks / trendMax) * 144" r="3.5" fill="#df6871" /><text v-if="index % trendLabelStep === 0" :x="12 + (index / Math.max(1, report.trend.length - 1)) * 496" y="198" text-anchor="middle" font-size="9" fill="#64748b">{{ item.label }}</text></g></svg></article>
                <article class="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:col-span-2"><h3 class="text-xs font-semibold text-slate-700">求助学生年级段分布</h3><div class="mt-3 flex items-center justify-center gap-8"><svg viewBox="0 0 140 140" class="size-36" role="img" aria-label="求助学生年级段环形图"><circle cx="70" cy="70" r="52" fill="none" stroke="#e2e8f0" stroke-width="18" /><circle v-for="segment in donutSegments" :key="segment.label" cx="70" cy="70" r="52" fill="none" :stroke="segment.color" stroke-width="18" :stroke-dasharray="`${segment.length} ${segment.gap}`" :stroke-dashoffset="-segment.offset" transform="rotate(-90 70 70)" /></svg><div class="grid grid-cols-2 gap-x-8 gap-y-2 text-xs"><div v-for="item in report.gradeDistribution" :key="item.label" class="flex items-center gap-2"><i class="size-2.5 rounded-full" :style="{ backgroundColor: item.color }" /><span class="text-slate-600">{{ item.label }}</span><strong class="ml-1 text-slate-800">{{ item.count }}</strong></div><p v-if="!report.gradeDistribution.length" class="text-slate-400">暂无年级数据</p></div></div></article>
              </div>
            </section>

            <section class="mt-7 print-no-break"><div class="mb-3 flex items-center justify-between"><h2 class="text-sm font-bold text-slate-800">03 · 年级服务与干预情况汇总</h2><span class="text-[11px] text-slate-400">只展示聚合指标</span></div><div class="overflow-hidden rounded-xl border border-slate-200"><table class="w-full border-collapse text-left text-[11px]"><thead class="bg-slate-100 text-slate-500"><tr><th class="px-3 py-2.5 font-semibold">年级</th><th class="px-3 py-2.5 font-semibold">咨询覆盖</th><th class="px-3 py-2.5 font-semibold">危机预警在册<br /><span class="font-normal">红 / 橙</span></th><th class="px-3 py-2.5 font-semibold">协同留痕</th><th class="px-3 py-2.5 font-semibold">高频困扰因素 TOP1</th><th class="px-3 py-2.5 font-semibold">整体态势</th></tr></thead><tbody><tr v-for="row in report.gradeRows" :key="row.grade" class="border-t border-slate-100"><td class="px-3 py-3 font-semibold text-slate-700">{{ row.grade }}</td><td class="px-3 py-3 text-slate-600">{{ row.consultationCount }} 人次</td><td class="px-3 py-3 text-slate-600">{{ row.highRiskCount }} 人 <span class="text-[10px] text-slate-400">({{ row.highRiskBreakdown }})</span></td><td class="px-3 py-3 text-slate-600">{{ row.trailCount }} 次</td><td class="px-3 py-3 text-slate-600">{{ row.topConcern }}</td><td class="px-3 py-3"><span class="inline-flex items-center gap-1 font-medium" :class="row.statusTone === 'watch' ? 'text-amber-700' : 'text-emerald-700'"><i class="size-2 rounded-full" :class="row.statusTone === 'watch' ? 'bg-amber-500' : 'bg-emerald-500'" />{{ row.statusLabel }}</span></td></tr><tr v-if="!report.gradeRows.length"><td colspan="6" class="px-3 py-8 text-center text-slate-400">当前时间段暂无可汇总的年级数据。</td></tr></tbody></table></div></section>

            <footer class="mt-8 flex items-end justify-between border-t border-slate-200 pt-4 text-[10px] text-slate-400"><span>报告生成时间：{{ report.generatedAt }} · {{ report.schoolName }}</span><span>第 1 页 / 共 1 页</span></footer>
          </template>
        </main>
      </section>
    </div>
  </Teleport>
</template>

<style>
.report-paper { min-height: 1123px; }
.report-export-modal { scrollbar-gutter: stable; }
@media print {
  body * { visibility: hidden; }
  #report-canvas, #report-canvas * { visibility: visible; }
  #report-canvas { position: absolute; left: 0; top: 0; width: 100% !important; max-width: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { size: A4 portrait; margin: 12mm 15mm; }
  .print-no-break { break-inside: avoid; page-break-inside: avoid; }
}
</style>
