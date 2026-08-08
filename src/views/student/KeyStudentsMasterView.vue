<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Download, FileText, PencilLine, Search, ShieldAlert, UsersRound } from '@lucide/vue'
import * as XLSX from 'xlsx'
import { useRouter } from 'vue-router'
import { db } from '../../db'
import { useSchoolConfigStore } from '../../stores/useSchoolConfigStore'
import { useStudentStore } from '../../stores/useStudentStore'
import { useTermStore } from '../../stores/useTermStore'
import { useWorkbenchStore } from '../../stores/workbench'
import { useSearchStore } from '../../stores/useSearchStore'
import StudentArchivePrintModal from '../../components/student/StudentArchivePrintModal.vue'
import StudentMasterPrintModal, { type StudentMasterPrintRow } from '../../components/student/StudentMasterPrintModal.vue'
import { getStudentGrade } from '../../utils/academic'
import type { ConsultationRecord, Student, StudentWarningLevel, WorkTrail } from '../../types/schema'

type WarningFilter = 'all' | StudentWarningLevel
type MasterRow = { student: Student; grade: string; warningLevel: StudentWarningLevel; concern: string; latestAt: string; attachmentCount: number }

const studentStore = useStudentStore()
const schoolConfig = useSchoolConfigStore()
const termStore = useTermStore()
const workbench = useWorkbenchStore()
const searchStore = useSearchStore()
const router = useRouter()
const selectedWarning = ref<WarningFilter>('all')
const selectedGrade = ref('')
const selectedClass = ref('')
const keyword = computed({ get: () => searchStore.searchKeyword, set: (value: string) => searchStore.setSearchKeyword(value) })
const consultations = ref<ConsultationRecord[]>([])
const trails = ref<WorkTrail[]>([])
const exportStudentId = ref<string | null>(null)
const showMasterPrint = ref(false)

const warningOptions: Array<{ value: WarningFilter; label: string; className: string }> = [
  { value: 'all', label: '全部等级', className: 'border-slate-200 bg-white text-slate-600' },
  { value: 'red', label: '🔴 一级 / 红色', className: 'border-rose-200 bg-rose-50 text-rose-700' },
  { value: 'orange', label: '🟠 二级 / 橙色', className: 'border-orange-200 bg-orange-50 text-orange-700' },
  { value: 'yellow', label: '🟡 三级 / 黄色', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'none', label: '⚪ 无 / 普通个案', className: 'border-slate-200 bg-slate-50 text-slate-600' },
  { value: 'other', label: '🟣 其他', className: 'border-purple-200 bg-purple-50 text-purple-700' },
]
const warningWeight: Record<StudentWarningLevel, number> = { red: 5, orange: 4, yellow: 3, other: 2, none: 1 }
const warningLabel: Record<StudentWarningLevel, string> = { red: '🔴 一级 / 红色', orange: '🟠 二级 / 橙色', yellow: '🟡 三级 / 黄色', none: '⚪ 无 / 普通个案', other: '🟣 其他' }
const warningClass: Record<StudentWarningLevel, string> = { red: 'bg-rose-50 text-rose-700 ring-rose-200', orange: 'bg-orange-50 text-orange-700 ring-orange-200', yellow: 'bg-amber-50 text-amber-700 ring-amber-200', none: 'bg-slate-50 text-slate-600 ring-slate-200', other: 'bg-purple-50 text-purple-700 ring-purple-200' }
const gradeOptions = computed(() => schoolConfig.enabledGrades)
const classOptions = computed(() => selectedGrade.value ? schoolConfig.classesForGrade(selectedGrade.value) : [...new Set(schoolConfig.enabledGrades.flatMap((grade) => schoolConfig.classesForGrade(grade)))].sort((left, right) => Number.parseInt(left) - Number.parseInt(right)))
const consultationsByStudent = computed(() => groupBy(consultations.value, (record) => record.studentId))
const trailsByStudent = computed(() => groupBy(trails.value, (trail) => trail.studentId ?? ''))

function groupBy<T>(items: T[], key: (item: T) => string) {
  const result = new Map<string, T[]>()
  items.forEach((item) => { const id = key(item); result.set(id, [...(result.get(id) ?? []), item]) })
  return result
}
function warningLevel(student: Student): StudentWarningLevel {
  if (student.warningLevel) return student.warningLevel
  if (student.riskLevel === 'crisis') return 'red'
  if (student.riskLevel === 'warning') return 'orange'
  if (student.riskLevel === 'attention') return 'yellow'
  return student.isIndividualCase ? 'other' : 'none'
}
function concernFor(student: Student) {
  const record = [...(consultationsByStudent.value.get(student.id) ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0]
  return record?.problemCategories?.join('、') || student.tags.slice(0, 3).join('、') || '暂无记录'
}
function latestAtFor(student: Student) {
  const dates = [...(consultationsByStudent.value.get(student.id) ?? []).map((record) => record.date), ...(trailsByStudent.value.get(student.id) ?? []).map((trail) => trail.dateTime)]
  return dates.sort((a, b) => b.localeCompare(a))[0] ?? '暂无记录'
}
const rows = computed<MasterRow[]>(() => studentStore.keyStudents.map((student) => ({ student, grade: getStudentGrade(student, termStore.currentTerm), warningLevel: warningLevel(student), concern: concernFor(student), latestAt: latestAtFor(student), attachmentCount: student.medicalAttachments?.length ?? 0 })).filter((row) => (!selectedWarning.value || selectedWarning.value === 'all' || row.warningLevel === selectedWarning.value) && (!selectedGrade.value || row.grade === selectedGrade.value) && (!selectedClass.value || row.student.className === selectedClass.value) && (!keyword.value.trim() || `${row.student.name} ${row.student.studentNo}`.toLocaleLowerCase().includes(keyword.value.trim().toLocaleLowerCase()))).sort((left, right) => warningWeight[right.warningLevel] - warningWeight[left.warningLevel] || left.student.name.localeCompare(right.student.name, 'zh-CN')))

async function load() {
  await Promise.all([studentStore.load(), schoolConfig.load()])
  const [loadedConsultations, loadedTrails] = await Promise.all([db.consultations.toArray(), db.workTrails.toArray()])
  consultations.value = loadedConsultations
  trails.value = loadedTrails
}
function openStudent(student: Student) { workbench.selectedStudentId = student.id; router.push('/students') }
function excelRows() { return rows.value.map((row) => ({ 姓名: row.student.name, 学号: row.student.studentNo, 年级: row.grade, 班级: row.student.className, 预警或个案等级: warningLabel[row.warningLevel], 主要困扰类型: row.concern, 最新辅导或留痕时间: row.latestAt, 就诊或会谈附件数: row.attachmentCount })) }
function exportExcel() {
  const sheet = XLSX.utils.json_to_sheet(excelRows())
  sheet['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 24 }, { wch: 22 }, { wch: 14 }]
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, '重点学生总表'); XLSX.writeFile(workbook, `重点学生与个案总表_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
function printMaster() { showMasterPrint.value = true }
function exportPerson(student: Student) { exportStudentId.value = student.id }
const masterPrintRows = computed<StudentMasterPrintRow[]>(() => rows.value.map((row) => ({ name: row.student.name, studentNo: row.student.studentNo, grade: row.grade, className: row.student.className, warning: warningLabel[row.warningLevel], concern: row.concern, latestAt: row.latestAt, attachmentCount: row.attachmentCount })))

onMounted(load)
</script>

<template>
  <section class="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50/60">
    <header class="shrink-0 border-b border-slate-200 bg-white px-6 py-5"><nav class="mb-5 flex w-fit items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" aria-label="学生档案页签"><RouterLink to="/students" class="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:text-emerald-800" active-class="bg-white text-emerald-800 shadow-sm">👥 全校学生档案</RouterLink><RouterLink to="/students/key-students" class="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:text-emerald-800" active-class="bg-white text-emerald-800 shadow-sm">📋 重点学生与个案总表</RouterLink></nav><div class="flex flex-wrap items-start justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">迎检台账 · 本地聚合</p><h1 class="mt-1 text-xl font-semibold text-slate-800">重点学生与个案总表</h1><p class="mt-1 text-sm text-slate-500">自动归集预警学生与个案辅导学生，不展示 SOAP 细节。</p></div><div class="flex flex-wrap gap-2"><button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100" @click="exportExcel"><Download :size="15" />导出当前总表 Excel</button><button type="button" class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800" @click="printMaster"><FileText :size="15" />打印 / 导出 PDF</button></div></div></header>
    <div class="min-h-0 flex-1 overflow-y-auto p-6"><div class="mx-auto max-w-7xl space-y-5"><div class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_150px_150px_220px]"><label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400"><Search :size="15" /><input v-model="keyword" class="min-w-0 flex-1 bg-transparent outline-none" placeholder="搜索学生姓名或学号" /></label><select v-model="selectedGrade" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"><option value="">全部年级</option><option v-for="grade in gradeOptions" :key="grade" :value="grade">{{ grade }}</option></select><select v-model="selectedClass" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"><option value="">全部班级</option><option v-for="className in classOptions" :key="className" :value="className">{{ className }}</option></select><select v-model="selectedWarning" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"><option v-for="item in warningOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></div><div class="flex flex-wrap items-center justify-between gap-3"><div class="flex items-center gap-2"><ShieldAlert :size="18" class="text-rose-500" /><span class="text-sm font-semibold text-slate-700">当前归集 {{ rows.length }} 人</span><span class="text-xs text-slate-400">预警或个案辅导任一条件满足即纳入</span></div><span class="text-xs text-slate-400">附件、咨询与留痕均为本机数据</span></div><div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div class="overflow-x-auto"><table class="min-w-[980px] w-full border-collapse text-left text-sm"><thead class="bg-slate-100 text-xs text-slate-500"><tr><th class="px-4 py-3 font-semibold">姓名</th><th class="px-4 py-3 font-semibold">班级</th><th class="px-4 py-3 font-semibold">预警 / 个案等级</th><th class="px-4 py-3 font-semibold">主要困扰类型</th><th class="px-4 py-3 font-semibold">最新辅导 / 留痕时间</th><th class="px-4 py-3 font-semibold">就诊 / 会谈附件数</th><th class="px-4 py-3 font-semibold">操作</th></tr></thead><tbody><tr v-for="row in rows" :key="row.student.id" class="border-t border-slate-100 hover:bg-emerald-50/30"><td class="px-4 py-3"><button type="button" class="font-semibold text-emerald-700 hover:underline" @click="openStudent(row.student)">{{ row.student.name }}</button><p class="mt-0.5 text-xs text-slate-400">{{ row.student.studentNo }}</p></td><td class="px-4 py-3 text-slate-600">{{ row.grade }}{{ row.student.className }}</td><td class="px-4 py-3"><span class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset" :class="warningClass[row.warningLevel]">{{ warningLabel[row.warningLevel] }}</span></td><td class="max-w-48 px-4 py-3 text-slate-600">{{ row.concern }}</td><td class="px-4 py-3 text-xs tabular-nums text-slate-500">{{ row.latestAt }}</td><td class="px-4 py-3 text-slate-600">📎 {{ row.attachmentCount }}</td><td class="px-4 py-3"><div class="flex items-center gap-2"><button type="button" class="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50" :disabled="Boolean(exportStudentId)" @click="exportPerson(row.student)">📄 单人卷宗</button><button type="button" class="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-emerald-300 hover:text-emerald-700" title="编辑学生档案" @click="openStudent(row.student)"><PencilLine :size="14" /></button></div></td></tr><tr v-if="!rows.length"><td colspan="7" class="px-4 py-16 text-center"><UsersRound :size="28" class="mx-auto text-slate-300" /><p class="mt-3 text-sm text-slate-500">暂无符合条件的重点学生或个案</p><p class="mt-1 text-xs text-slate-400">调整筛选条件后重试。</p></td></tr></tbody></table></div></div></div></div>
  </section><StudentArchivePrintModal v-if="exportStudentId" :student-id="exportStudentId" @close="exportStudentId = null" /><StudentMasterPrintModal v-if="showMasterPrint" :rows="masterPrintRows" @close="showMasterPrint = false" />
</template>
