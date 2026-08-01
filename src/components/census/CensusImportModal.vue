<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, Upload, X } from '@lucide/vue'
import { useCensusStore, type CensusImportRow } from '../../stores/useCensusStore'
import { useTermStore } from '../../stores/useTermStore'
import { db } from '../../db'
import { parseScaleRow, SCALE_OPTIONS, type CensusScaleType } from '../../utils/censusParsers'

const emit = defineEmits<{ close: []; imported: [] }>()
const censusStore = useCensusStore()
const termStore = useTermStore()
const rawRows = ref<Array<Record<string, unknown>>>([])
const parsedRows = ref<CensusImportRow[]>([])
const message = ref('')
const saving = ref(false)
const form = reactive({ title: `${termStore.currentTerm?.academicYear ?? new Date().getFullYear()} 学年心理普查`, scaleType: 'MHT' as CensusScaleType, date: new Date().toISOString().slice(0, 10), createMissingStudents: false })
const selectedScale = computed(() => SCALE_OPTIONS.find((item) => item.value === form.scaleType) ?? SCALE_OPTIONS[0])
const matchedNos = ref(new Set<string>())
const factorKeys = computed(() => parsedRows.value.flatMap((row) => Object.keys(row.scores)).filter((key, index, keys) => keys.indexOf(key) === index))
const matchedCount = computed(() => parsedRows.value.filter((row) => matchedNos.value.has(row.studentNo)).length)
const pick = (row: Record<string, unknown>, names: string[]) => names.map((name) => row[name]).find((value) => String(value ?? '').trim())

function parse() {
  const parsed = rawRows.value.map((source) => {
    const studentNo = String(pick(source, ['学号', '学生学号', 'studentNo']) ?? '').trim()
    const studentName = String(pick(source, ['姓名', '学生姓名', 'studentName']) ?? '').trim()
    const className = String(pick(source, ['班级', '班别', 'className']) ?? '').trim()
    const calculated = parseScaleRow(source, form.scaleType)
    return { studentNo, studentName, className, ...calculated }
  }).filter((row) => row.studentNo && row.studentName && Object.keys(row.scores).length)
  parsedRows.value = parsed
  void matchStudents()
}
async function matchStudents() { const numbers = new Set((await db.students.toArray()).map((student) => student.studentNo)); matchedNos.value = new Set(parsedRows.value.filter((row) => numbers.has(row.studentNo)).map((row) => row.studentNo)) }
async function read(file?: File) {
  if (!file) return
  try { const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; rawRows.value = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }); parse(); message.value = '' } catch { message.value = '无法解析该文件，请确认是有效的 .xlsx 或 .csv 文件。' }
}
async function confirm() {
  if (!parsedRows.value.length) { message.value = '请先上传包含有效学号、姓名和分数列的数据文件。'; return }
  saving.value = true; message.value = ''
  try { await censusStore.importBatch({ title: form.title, scaleName: selectedScale.value.label, date: form.date, termId: termStore.currentTermId, rows: parsedRows.value, createMissingStudents: form.createMissingStudents }); emit('imported'); emit('close') } catch (error) { message.value = error instanceof Error ? error.message : '导入失败，请检查数据后重试。' } finally { saving.value = false }
}
function downloadTemplate() { const book = XLSX.utils.book_new(); const sheet = XLSX.utils.json_to_sheet([selectedScale.value.template]); XLSX.utils.book_append_sheet(book, sheet, '普查数据'); XLSX.writeFile(book, `${form.scaleType}_普查导入模板.xlsx`) }
</script>

<template><Teleport to="body"><div class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 p-4" @click.self="emit('close')"><section class="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><header class="flex items-start justify-between gap-4"><div><h2 class="text-lg font-semibold text-stone-800">导入新普查数据</h2><p class="mt-1 text-sm text-stone-500">文件仅在本机浏览器中解析；导入后自动关联学生档案和服务履历。</p></div><button type="button" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" @click="emit('close')"><X :size="18" /></button></header><p v-if="message" class="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ message }}</p><div class="mt-5 grid gap-4 md:grid-cols-3"><label class="text-sm font-medium text-stone-700">批次名称<input v-model="form.title" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="text-sm font-medium text-stone-700">量表类型<select v-model="form.scaleType" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" @change="parse"><option v-for="scale in SCALE_OPTIONS" :key="scale.value" :value="scale.value">{{ scale.label }}</option></select></label><label class="text-sm font-medium text-stone-700">测试日期<input v-model="form.date" type="date" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="mt-6 inline-flex items-center gap-2 text-sm text-stone-600"><input v-model="form.createMissingStudents" type="checkbox" class="accent-teal-700" />自动创建未匹配学生档案</label></div><div class="mt-5 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 p-6 text-center"><FileSpreadsheet class="mx-auto text-teal-700" :size="28" /><p class="mt-2 text-sm font-medium text-stone-700">上传 Excel 或 CSV</p><p class="mt-1 text-xs text-stone-400">按所选量表自动计算分值、风险等级与异常因子</p><div class="mt-3 flex justify-center gap-2"><button type="button" class="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600 hover:bg-stone-100" @click="downloadTemplate">下载 {{ form.scaleType }} 模板</button><label class="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800"><Upload :size="14" />选择文件<input class="hidden" type="file" accept=".xlsx,.csv" @change="read(($event.target as HTMLInputElement).files?.[0])" /></label></div></div><div v-if="parsedRows.length" class="mt-5"><div class="flex flex-wrap items-center justify-between gap-2"><p class="text-sm font-semibold text-stone-800">导入预览 <span class="font-normal text-stone-400">有效 {{ parsedRows.length }} 条，已关联 {{ matchedCount }} 条，预警 {{ parsedRows.filter((row) => row.isFlagged).length }} 条</span></p><span class="text-xs text-stone-400">识别因子：{{ factorKeys.join('、') }}</span></div><div class="mt-2 max-h-56 overflow-auto rounded-xl border border-stone-200"><table class="w-full text-left text-xs"><thead class="sticky top-0 bg-stone-50 text-stone-500"><tr><th class="p-2">学号</th><th>姓名</th><th>班级</th><th>关联</th><th>预警</th><th>原因</th></tr></thead><tbody><tr v-for="row in parsedRows" :key="row.studentNo" class="border-t border-stone-100"><td class="p-2">{{ row.studentNo }}</td><td>{{ row.studentName }}</td><td>{{ row.className }}</td><td :class="matchedNos.has(row.studentNo) ? 'text-emerald-700' : 'text-amber-700'">{{ matchedNos.has(row.studentNo) ? '已匹配' : '未匹配' }}</td><td :class="row.isFlagged ? 'text-rose-700' : 'text-emerald-700'">{{ row.isFlagged ? '预警' : '正常' }}</td><td>{{ row.flaggedReasons.join('；') || '—' }}</td></tr></tbody></table></div></div><footer class="mt-6 flex justify-end gap-2 border-t border-stone-100 pt-5"><button type="button" class="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100" @click="emit('close')">取消</button><button type="button" :disabled="saving || !parsedRows.length" class="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="confirm">{{ saving ? '导入中…' : '确认导入' }}</button></footer></section></div></Teleport></template>
