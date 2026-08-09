<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Printer, X } from '@lucide/vue'
import { buildDossierTimeline, formatDossierDate, getStudentWarningLabel, getStudentWarningLevel, loadStudentDossierData, type DossierData } from '../../services/singleStudentExporter'

const props = defineProps<{ studentId: string }>()
const emit = defineEmits<{ close: [] }>()
const data = ref<DossierData>()
const loading = ref(true)
const error = ref('')

function print() { window.print() }

onMounted(async () => {
  try {
    data.value = await loadStudentDossierData(props.studentId)
    if (!data.value) error.value = '未找到该学生档案。'
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '卷宗数据读取失败。'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <Teleport to="body">
    <div class="student-archive-print-modal fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 sm:p-8" @click.self="emit('close')">
      <section class="w-full max-w-[1050px] overflow-hidden rounded-xl bg-slate-900 shadow-2xl">
        <header class="flex items-center justify-between gap-4 px-6 py-4 text-white print:hidden">
          <div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">A4 迎检卷宗预览</p><h2 class="mt-1 text-base font-bold">学生心理健康辅导与危机干预完整卷宗</h2></div>
          <div class="flex items-center gap-2"><button type="button" class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600" :disabled="loading || Boolean(error)" @click="print"><Printer :size="15" />打印 / 另存为 PDF</button><button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="关闭卷宗预览" @click="emit('close')"><X :size="18" /></button></div>
        </header>

        <main id="student-archive-canvas" class="student-archive-paper mx-auto max-w-[794px] bg-white p-8 text-slate-800">
          <div v-if="loading" class="flex min-h-[620px] items-center justify-center text-sm text-slate-400">正在整理学生卷宗…</div>
          <div v-else-if="error" class="flex min-h-[620px] items-center justify-center text-sm text-rose-600">{{ error }}</div>
          <template v-else-if="data">
            <section class="archive-cover print-no-break"><p class="archive-eyebrow">{{ data.schoolName }}</p><h1>《学生心理健康辅导与危机干预完整卷宗》</h1><div class="archive-cover-meta"><span>学生：{{ data.student.name }} · 学号：{{ data.student.studentNo }}</span><span class="archive-badge">内部资料 · 保密</span></div></section>

            <section class="archive-section print-no-break"><h2>模块 1 · 基本信息</h2><div class="archive-info-grid"><div><span>姓名</span><strong>{{ data.student.name }}</strong></div><div><span>学号</span><strong>{{ data.student.studentNo }}</strong></div><div><span>班级</span><strong>{{ data.student.grade }} {{ data.student.className }}</strong></div><div><span>预警 / 个案等级</span><strong>{{ getStudentWarningLabel(getStudentWarningLevel(data.student)) }}</strong></div><div><span>监护人 / 紧急联系人</span><strong>{{ data.student.emergencyContact?.name || '—' }} · {{ data.student.emergencyContact?.phone || '—' }}</strong></div><div><span>困扰类型</span><strong>{{ data.student.tags?.join('、') || '以咨询记录为准' }}</strong></div></div></section>

            <section class="archive-section"><h2>模块 2 · 医疗与会谈存证清单</h2><ul class="archive-list"><li v-for="attachment in data.student.medicalAttachments ?? []" :key="attachment.id" class="archive-row"><div><strong>{{ attachment.name }}</strong><span>{{ attachment.type === 'pdf' ? 'PDF' : '图片' }} · {{ attachment.date }}</span></div><p>{{ attachment.note || '未填写备注' }}</p></li><li v-if="!(data.student.medicalAttachments ?? []).length" class="archive-muted">暂无就诊或会谈附件。</li></ul></section>

            <section class="archive-section"><h2>模块 3 · 历次个体咨询 SOAP 记录</h2><article v-for="record in data.consultations" :key="record.id" class="archive-consultation print-no-break"><div class="archive-record-heading"><strong>第 {{ record.sessionIndex || 1 }} 次个体咨询</strong><span>{{ record.date }} · {{ record.durationMinutes || 40 }} 分钟 · {{ record.visitType === 'active' ? '主动来访' : record.visitType === 'referral' ? '教师转介' : '普查约访' }}</span></div><p class="archive-muted">困扰类型：{{ record.problemCategories?.join('、') || '未分类' }} · 当次风险：{{ record.riskLevelAtTime || '未记录' }}</p><div class="archive-soap-grid"><div><b>S · 主观陈述</b><p>{{ record.soap?.subjective || '未填写' }}</p></div><div><b>O · 客观观察</b><p>{{ record.soap?.objective || '未填写' }}</p></div><div><b>A · 评估分析</b><p>{{ record.soap?.assessment || '未填写' }}</p></div><div><b>P · 后续计划</b><p>{{ record.soap?.plan || '未填写' }}</p></div></div></article><p v-if="!data.consultations.length" class="archive-muted archive-empty">暂无个体咨询记录。</p></section>

            <section class="archive-section"><h2>模块 4 · 工作留痕与家校 / 领导协同记录</h2><ul class="archive-list"><li v-for="trail in data.workTrails" :key="trail.id" class="archive-row print-no-break"><div><strong>{{ trail.title }}</strong><span>{{ formatDossierDate(trail.dateTime) }} · {{ trail.stakeholderName }}</span></div><p>{{ trail.content || '未填写内容' }}</p></li><li v-if="!data.workTrails.length" class="archive-muted">暂无工作留痕。</li></ul></section>

            <section class="archive-section"><h2>模块 5 · 服务履历 Timeline</h2><ol class="archive-timeline" v-html="buildDossierTimeline(data)" /></section>
            <footer class="archive-footer"><span>报告生成时间：{{ data.generatedAt }} · {{ data.schoolName }}</span><span>内部资料 · 请妥善保管</span></footer>
          </template>
        </main>
      </section>
    </div>
  </Teleport>
</template>

<style>
.student-archive-paper { min-height: 1123px; }
.archive-cover { min-height: 230px; display: flex; flex-direction: column; justify-content: center; border-bottom: 2px solid #0f766e; }
.archive-eyebrow { margin: 0; color: #0f766e; font-size: 11px; font-weight: 700; letter-spacing: .2em; }
.archive-cover h1 { margin: 12px 0 0; color: #0f172a; font-size: 25px; line-height: 1.35; }
.archive-cover-meta { display: flex; justify-content: space-between; gap: 16px; margin-top: 28px; color: #475569; font-size: 11px; }
.archive-badge { border: 1px solid #86efac; border-radius: 999px; padding: 2px 9px; color: #047857; background: #f0fdf4; font-size: 10px; font-weight: 700; }
.archive-section { margin-top: 20px; }
.archive-section h2 { margin: 0; padding-bottom: 6px; border-bottom: 1px solid #cbd5e1; color: #0f766e; font-size: 15px; }
.archive-info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 10px; border: 1px solid #e2e8f0; }
.archive-info-grid > div { padding: 7px 10px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
.archive-info-grid > div:nth-child(2n) { border-right: 0; }
.archive-info-grid > div:nth-last-child(-n+2) { border-bottom: 0; }
.archive-info-grid span, .archive-row span, .archive-record-heading span { display: block; color: #64748b; font-size: 10px; }
.archive-info-grid strong, .archive-row strong, .archive-record-heading strong { color: #0f172a; }
.archive-list { margin: 10px 0; padding: 0; list-style: none; }
.archive-row { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
.archive-row:last-child { border-bottom: 0; }
.archive-row p, .archive-soap-grid p, .archive-timeline p { margin: 3px 0 0; color: #475569; white-space: pre-wrap; }
.archive-consultation { margin-top: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; }
.archive-record-heading { display: flex; justify-content: space-between; gap: 12px; }
.archive-soap-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
.archive-soap-grid > div { padding: 7px; border: 1px solid #e2e8f0; border-radius: 6px; }
.archive-soap-grid b { color: #0f766e; font-size: 10px; }
.archive-muted { color: #64748b; font-size: 10px; }
.archive-empty { margin-top: 10px; }
.archive-timeline { margin: 10px 0; padding: 0; list-style: none; }
.archive-timeline .timeline-row { display: grid; grid-template-columns: 135px 1fr; gap: 12px; padding: 5px 0 5px 12px; border-left: 2px solid #99f6e4; }
.archive-timeline time { color: #64748b; font-size: 10px; }
.archive-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 26px; padding-top: 8px; border-top: 1px solid #cbd5e1; color: #64748b; font-size: 10px; }
.print-no-break { break-inside: avoid; page-break-inside: avoid; }
@media print {
  body * { visibility: hidden !important; }
  #student-archive-canvas, #student-archive-canvas * { visibility: visible !important; }
  #student-archive-canvas { position: absolute; left: 0; top: 0; width: 100% !important; max-width: none !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { size: A4 portrait; margin: 13mm 15mm; }
  .print-no-break { break-inside: avoid; page-break-inside: avoid; }
}
</style>
