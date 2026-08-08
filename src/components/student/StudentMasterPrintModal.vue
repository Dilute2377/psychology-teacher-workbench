<script setup lang="ts">
import { Printer, X } from '@lucide/vue'

export type StudentMasterPrintRow = {
  name: string
  studentNo: string
  grade: string
  className: string
  warning: string
  concern: string
  latestAt: string
  attachmentCount: number
}

defineProps<{ rows: StudentMasterPrintRow[] }>()
const emit = defineEmits<{ close: [] }>()
function print() { window.print() }
</script>

<template>
  <Teleport to="body">
    <div class="student-master-print-modal fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 sm:p-8" @click.self="emit('close')">
      <section class="w-full max-w-[1180px] overflow-hidden rounded-xl bg-slate-900 shadow-2xl">
        <header class="flex items-center justify-between gap-4 px-6 py-4 text-white print:hidden"><div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">A4 台账预览</p><h2 class="mt-1 text-base font-bold">重点学生与个案总表</h2></div><div class="flex items-center gap-2"><button type="button" class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600" @click="print"><Printer :size="15" />打印 / 另存为 PDF</button><button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="关闭台账预览" @click="emit('close')"><X :size="18" /></button></div></header>
        <main id="student-master-print-canvas" class="mx-auto min-h-[760px] max-w-[1120px] bg-white p-8 text-slate-800"><header class="border-b border-slate-200 pb-4"><p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">迎检台账 · 本地聚合</p><h1 class="mt-2 text-2xl font-bold">重点学生与个案总表</h1><p class="mt-2 text-xs text-slate-500">生成时间：{{ new Date().toLocaleString('zh-CN', { hour12: false }) }} · 当前筛选 {{ rows.length }} 人 · 内部资料 · 请妥善保管</p></header><div class="mt-6 overflow-hidden rounded-xl border border-slate-200"><table class="w-full border-collapse text-left text-xs"><thead class="bg-slate-100 text-slate-500"><tr><th class="px-3 py-2.5 font-semibold">姓名 / 学号</th><th class="px-3 py-2.5 font-semibold">班级</th><th class="px-3 py-2.5 font-semibold">预警 / 个案等级</th><th class="px-3 py-2.5 font-semibold">主要困扰类型</th><th class="px-3 py-2.5 font-semibold">最新辅导 / 留痕时间</th><th class="px-3 py-2.5 font-semibold">就诊 / 会谈附件数</th></tr></thead><tbody><tr v-for="row in rows" :key="row.studentNo" class="border-t border-slate-100"><td class="px-3 py-2.5"><strong>{{ row.name }}</strong><span class="mt-0.5 block text-[10px] text-slate-400">{{ row.studentNo }}</span></td><td class="px-3 py-2.5">{{ row.grade }}{{ row.className }}</td><td class="px-3 py-2.5">{{ row.warning }}</td><td class="px-3 py-2.5">{{ row.concern }}</td><td class="px-3 py-2.5">{{ row.latestAt }}</td><td class="px-3 py-2.5">{{ row.attachmentCount }}</td></tr><tr v-if="!rows.length"><td colspan="6" class="px-3 py-10 text-center text-slate-400">当前筛选暂无数据。</td></tr></tbody></table></div><footer class="mt-6 flex justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400"><span>心理健康指导中心</span><span>第 1 页 / 共 1 页</span></footer></main>
      </section>
    </div>
  </Teleport>
</template>

<style>
@media print {
  body * { visibility: hidden !important; }
  #student-master-print-canvas, #student-master-print-canvas * { visibility: visible !important; }
  #student-master-print-canvas { position: absolute; left: 0; top: 0; width: 100% !important; max-width: none !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { size: A4 landscape; margin: 12mm 15mm; }
}
</style>
