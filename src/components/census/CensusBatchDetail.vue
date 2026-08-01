<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowUpRight, CalendarDays, ClipboardPlus, Search, TriangleAlert, UsersRound } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { db } from '../../db'
import { useCensusStore } from '../../stores/useCensusStore'
import { useConsultationStore } from '../../stores/useConsultationStore'
import { useWorkbenchStore } from '../../stores/workbench'
import { getStudentGrade } from '../../utils/academic'
import { useTermStore } from '../../stores/useTermStore'
import { useSchoolConfigStore } from '../../stores/useSchoolConfigStore'
import { K12_GRADES } from '../../constants/grades'
import type { CensusResult, Student } from '../../types/schema'
import { censusReasonsToConsultationCategories, formatCensusFactor, isCensusFactorFlagged } from '../../utils/census'

const censusStore = useCensusStore(); const consultationStore = useConsultationStore(); const workbench = useWorkbenchStore(); const termStore = useTermStore(); const router = useRouter()
/** 学生主表是真实展示源；普查导入行中的姓名只作为未关联时的降级兜底。 */
const allStudents = ref<Student[]>([]); const keyword = ref(''); const flaggedOnly = ref(false); const grade = ref(''); const className = ref(''); const riskStatus = ref<'all' | 'normal' | 'flagged'>('all'); const schoolConfig = useSchoolConfigStore()
const studentById = computed(() => new Map(allStudents.value.map((student) => [student.id, student])))
const studentByNo = computed(() => new Map(allStudents.value.map((student) => [student.studentNo, student])))
const formattedCensusResults = computed(() => censusStore.censusResults.map((record) => {
  const studentRef = studentById.value.get(record.studentId) ?? studentByNo.value.get(record.studentNo)
  return {
    ...record,
    studentRef,
    displayName: studentRef?.name || record.studentName?.trim() || '未关联学生',
    displayGrade: studentRef ? getStudentGrade(studentRef, termStore.currentTerm) : '未知年级',
    displayClassName: studentRef?.className || '',
    displayClass: studentRef ? `${getStudentGrade(studentRef, termStore.currentTerm)}${studentRef.className}` : '未知班级',
  }
}))
const classOptions = computed(() => grade.value ? schoolConfig.classesForGrade(grade.value) : [...new Set(schoolConfig.enabledGrades.flatMap((item) => schoolConfig.classesForGrade(item)))].sort((left, right) => Number.parseInt(left) - Number.parseInt(right)))
const visibleRows = computed(() => formattedCensusResults.value
  .filter((row) => !grade.value || row.displayGrade === grade.value)
  .filter((row) => !className.value || row.displayClassName === className.value)
  .filter((row) => !flaggedOnly.value || row.isFlagged)
  .filter((row) => riskStatus.value === 'all' || (riskStatus.value === 'flagged' ? row.isFlagged : !row.isFlagged))
  .filter((row) => !keyword.value.trim() || [row.displayName, row.studentNo].join(' ').includes(keyword.value.trim()))
  .sort((left, right) => (K12_GRADES.indexOf(left.displayGrade as never) - K12_GRADES.indexOf(right.displayGrade as never)) || (Number.parseInt(left.displayClassName, 10) - Number.parseInt(right.displayClassName, 10)) || left.studentNo.localeCompare(right.studentNo, 'zh-CN', { numeric: true })))
const factorRanking = computed(() => { const count = new Map<string, number>(); censusStore.censusResults.filter((row) => row.isFlagged).forEach((row) => row.flaggedReasons.forEach((reason) => count.set(reason, (count.get(reason) ?? 0) + 1))); return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4) })
const percentage = computed(() => censusStore.selectedBatch?.totalCount ? Math.round((censusStore.selectedBatch.flaggedCount / censusStore.selectedBatch.totalCount) * 100) : 0)
async function loadStudents() { allStudents.value = await db.students.toArray() }
function openStudent(id: string) { workbench.selectedStudentId = id; router.push('/students') }
function factorEntries(row: CensusResult) { return Object.entries(row.scores).map(([factor, score]) => ({ factor, label: formatCensusFactor(factor), score: Number(score), flagged: isCensusFactorFlagged(factor, Number(score), row.flaggedReasons) })) }
function startConsultation(row: CensusResult) {
  const batchTitle = censusStore.selectedBatch?.title ?? '本次心理普查'
  const factors = row.flaggedReasons.length ? row.flaggedReasons.join('、') : '需进一步复核的因子'
  workbench.pendingConsultationContext = {
    studentId: row.studentId,
    visitType: 'census_followup',
    problemCategories: censusReasonsToConsultationCategories(row.flaggedReasons),
    subjective: `【普查约访】依据 ${batchTitle} 测评结果，该生在 [${factors}] 因子得分超标，特进行约访沟通。`,
  }
  consultationStore.openForm()
  router.push('/consultations')
}
watch(() => censusStore.selectedBatchId, () => void censusStore.fetchResults())
watch(() => workbench.studentVersion, () => void loadStudents())
onMounted(async () => { await schoolConfig.load(); await loadStudents() })
</script>

<template><section v-if="!censusStore.selectedBatch" class="flex h-full flex-col items-center justify-center p-8 text-center"><CalendarDays :size="28" class="text-teal-700" /><h1 class="mt-3 text-lg font-semibold text-stone-800">心理普查</h1><p class="mt-2 text-sm text-stone-500">请从中间列表选择一个普查批次，或导入新的测评数据。</p></section><section v-else class="flex h-full min-h-0 flex-col overflow-hidden"><header class="shrink-0 border-b border-stone-200 p-6"><div class="flex flex-wrap items-start justify-between gap-3"><div><p class="text-xs font-medium text-teal-700">{{ censusStore.selectedBatch.scaleName }}</p><h1 class="mt-1 text-xl font-semibold text-stone-800">{{ censusStore.selectedBatch.title }}</h1><p class="mt-1 text-sm text-stone-500">{{ censusStore.selectedBatch.date }} · {{ censusStore.selectedBatch.totalCount }} 名实测学生</p></div><span class="rounded-full bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700">预警 {{ censusStore.selectedBatch.flaggedCount }} 人</span></div></header><div class="min-h-0 flex-1 overflow-y-auto bg-stone-50/60 p-6"><div class="mx-auto max-w-6xl space-y-5"><div class="grid gap-4 md:grid-cols-3"><article class="rounded-2xl border border-stone-200 bg-white p-4"><UsersRound :size="18" class="text-teal-700" /><p class="mt-4 text-2xl font-semibold text-stone-800">{{ censusStore.selectedBatch.totalCount }}</p><p class="text-sm text-stone-500">实测人数</p></article><article class="rounded-2xl border border-rose-100 bg-white p-4"><TriangleAlert :size="18" class="text-rose-600" /><p class="mt-4 text-2xl font-semibold text-stone-800">{{ percentage }}%</p><p class="text-sm text-stone-500">预警比例</p></article><article class="rounded-2xl border border-amber-100 bg-white p-4"><p class="text-xs font-medium text-amber-700">高频异常因子</p><p v-if="factorRanking.length" class="mt-2 text-sm leading-6 text-stone-700">{{ factorRanking.map(([reason, count]) => `${reason} ${count}人`).join(' · ') }}</p><p v-else class="mt-2 text-sm text-stone-400">本批次无预警因子</p></article></div><div class="rounded-2xl border border-stone-200 bg-white"><div class="flex flex-wrap items-center gap-3 border-b border-stone-100 p-4"><label class="flex min-w-52 flex-1 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-400"><Search :size="15" /><input v-model="keyword" class="w-full bg-transparent outline-none" placeholder="搜姓名/学号" /></label><select v-model="grade" class="rounded-lg border border-stone-200 px-3 py-2 text-sm"><option value="">全部年级</option><option v-for="item in schoolConfig.enabledGrades" :key="item">{{ item }}</option></select><select v-model="className" class="rounded-lg border border-stone-200 px-3 py-2 text-sm"><option value="">全部班级</option><option v-for="item in classOptions" :key="item">{{ item }}</option></select><select v-model="riskStatus" class="rounded-lg border border-stone-200 px-3 py-2 text-sm"><option value="all">全部状态</option><option value="normal">正常</option><option value="flagged">预警</option></select><label class="inline-flex items-center gap-2 text-sm text-stone-600"><input v-model="flaggedOnly" type="checkbox" class="accent-teal-700" />仅看预警</label></div><div class="overflow-x-auto"><table class="w-full min-w-[880px] table-fixed text-left text-sm"><colgroup><col class="w-[160px]" /><col class="w-[100px]" /><col /><col class="w-[90px]" /><col class="w-[180px]" /><col class="w-[160px]" /></colgroup><thead class="bg-stone-50 text-xs text-stone-500"><tr><th class="px-4 py-3">姓名 / 学号</th><th class="px-3 py-3">班级</th><th class="px-3 py-3">因子得分</th><th class="px-3 py-3">预警状态</th><th class="px-3 py-3">预警原因</th><th class="px-3 py-3 text-right">操作</th></tr></thead><tbody><tr v-for="row in visibleRows" :key="row.id" class="border-t border-stone-100"><td class="truncate px-4 py-3 font-medium text-stone-800" :title="`${row.displayName} ${row.studentNo}`">{{ row.displayName }}<span class="ml-1 text-xs font-normal text-stone-400">{{ row.studentNo }}</span></td><td class="truncate px-3 py-3 text-stone-600" :title="row.displayClass">{{ row.displayClass }}</td><td class="px-3 py-3"><div class="flex max-h-14 flex-wrap gap-1 overflow-hidden"><span v-for="item in factorEntries(row)" :key="item.factor" class="inline-flex h-6 items-center rounded-md px-1.5 text-xs whitespace-nowrap" :class="item.flagged ? 'bg-rose-50 font-medium text-rose-700' : 'bg-stone-100 text-stone-600'"><span v-if="item.flagged" class="mr-0.5">🔴</span>{{ item.label }}: {{ item.score }}</span></div></td><td class="px-3 py-3"><span class="inline-flex h-6 items-center rounded-full px-2 text-xs font-medium" :class="row.isFlagged ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'">{{ row.isFlagged ? '预警' : '正常' }}</span></td><td class="truncate px-3 py-3 text-xs text-stone-500" :title="row.flaggedReasons.join('；')">{{ row.flaggedReasons.join('；') || '—' }}</td><td class="whitespace-nowrap px-3 py-3 text-right"><button type="button" class="mr-2 text-xs font-medium text-teal-700 hover:text-teal-900" :disabled="!row.studentRef" :class="!row.studentRef && 'cursor-not-allowed opacity-40'" @click="row.studentRef && openStudent(row.studentRef.id)">查看档案 <ArrowUpRight :size="12" class="inline" /></button><button type="button" class="text-xs font-medium text-amber-700 hover:text-amber-900" :disabled="!row.studentRef" :class="!row.studentRef && 'cursor-not-allowed opacity-40'" @click="row.studentRef && startConsultation({ ...row, studentId: row.studentRef.id })"><ClipboardPlus :size="12" class="inline" />快捷约访</button></td></tr><tr v-if="visibleRows.length === 0"><td colspan="6" class="px-4 py-10 text-center text-sm text-stone-400">没有符合条件的数据。</td></tr></tbody></table></div></div></div></div></section></template>
