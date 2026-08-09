<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowDownUp, Plus, Search, UserRound, X } from '@lucide/vue'
import { studentService } from '../../services/studentService'
import { useWorkbenchStore } from '../../stores/workbench'
import { useSearchStore } from '../../stores/useSearchStore'
import { useTermStore } from '../../stores/useTermStore'
import type { RiskLevel, Student } from '../../types/schema'
import BatchImportModal from './BatchImportModal.vue'
import { getStudentGrade } from '../../utils/academic'
import { useSchoolConfigStore } from '../../stores/useSchoolConfigStore'
import { useCrisisConfigStore } from '../../stores/useCrisisConfigStore'
import { STAGE_GRADES } from '../../constants/grades'

const workbench = useWorkbenchStore()
const searchStore = useSearchStore()
const termStore = useTermStore()
const schoolConfig = useSchoolConfigStore()
const crisisConfig = useCrisisConfigStore()
/** 全量数据源：筛选选项永远只能从这里计算。 */
const allStudents = ref<Student[]>([])
const isAdding = ref(false)
const isImporting = ref(false)
const fileInput = ref<HTMLInputElement>()
const importFile = ref<File | null>(null)
const includeGraduated = ref(false)
const grade = ref('')
const className = ref('')
const riskLevel = ref<RiskLevel | ''>('')
const riskSort = ref<'desc' | 'asc'>('desc')
const isLoading = ref(true)
const errorMessage = ref('')
const newStudent = ref({ name: '', studentNo: '', gender: 'female' as Student['gender'], grade: '初一', className: '1班', contactName: '', relation: '家长', phone: '', riskLevel: 'normal' as RiskLevel, tags: '' })

const studentGrade = (student: Student) => getStudentGrade(student, termStore.currentTerm)
const gradeOptions = computed(() => schoolConfig.enabledGrades)
/** 班级由学校配置生成，不随筛选或学生数据增减。 */
const classOptions = computed(() => grade.value ? schoolConfig.classesForGrade(grade.value) : [...new Set(schoolConfig.enabledGrades.flatMap((item) => schoolConfig.classesForGrade(item)))].sort((left, right) => Number.parseInt(left) - Number.parseInt(right)))
const riskOptions = computed<Array<{ label: string; value: RiskLevel }>>(() => crisisConfig.getDropdownOptions().map((item) => ({ label: `${item.emoji} ${item.label}`, value: item.riskValue })))
const keyword = computed({ get: () => searchStore.searchKeyword, set: (value: string) => searchStore.setSearchKeyword(value) })
const riskBadge = (student: Student) => crisisConfig.getStudentWarningBadge(student.warningLevel ?? student.riskLevel)
const isNonActiveStudent = (student: Student) => student.status !== 'active' || studentGrade(student) === '已毕业'
const filteredStudents = computed(() => {
  const search = keyword.value.trim().toLocaleLowerCase()
  const students = allStudents.value.filter((student) =>
    (!grade.value || studentGrade(student) === grade.value)
    && (!className.value || student.className === className.value)
    && (!riskLevel.value || student.riskLevel === riskLevel.value)
    && (includeGraduated.value || !isNonActiveStudent(student))
    && (!search || [student.name, student.studentNo, ...student.tags].join(' ').toLocaleLowerCase().includes(search)),
  )
  const direction = riskSort.value === 'desc' ? -1 : 1
  return [...students].sort((left, right) => (riskBadge(left).weight - riskBadge(right).weight) * direction || left.name.localeCompare(right.name, 'zh-CN'))
})

function toggleRiskSort() { riskSort.value = riskSort.value === 'desc' ? 'asc' : 'desc' }

async function loadStudents() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    allStudents.value = await studentService.list()
  } catch {
    errorMessage.value = '学生档案暂时无法读取，请刷新后重试。'
  } finally {
    isLoading.value = false
  }
}

function selectStudent(student: Student) { workbench.selectedStudentId = student.id }
function triggerImport() { fileInput.value?.click() }
function handleImportFile(event: Event) { importFile.value = (event.target as HTMLInputElement).files?.[0] ?? null; if (importFile.value) isImporting.value = true; (event.target as HTMLInputElement).value = '' }
function stageForGrade(gradeName: string) { return (Object.entries(STAGE_GRADES).find(([, grades]) => grades.includes(gradeName as never))?.[0] ?? 'junior') as Student['educationStage'] }
function gradeOffset(gradeName: string) { return Object.values(STAGE_GRADES).find((grades) => grades.includes(gradeName as never))?.indexOf(gradeName as never) ?? 0 }
function resetNewStudent() { newStudent.value = { name: '', studentNo: '', gender: 'female', grade: schoolConfig.enabledGrades[0] ?? '初一', className: '1班', contactName: '', relation: '家长', phone: '', riskLevel: 'normal', tags: '' } }

async function createStudent() {
  if (!newStudent.value.name.trim() || !newStudent.value.studentNo.trim()) return
  try {
    const student = await studentService.create({
      name: newStudent.value.name.trim(), studentNo: newStudent.value.studentNo.trim(), gender: newStudent.value.gender, enrollmentYear: Number(termStore.currentTerm?.academicYear.split('-')[0] ?? new Date().getFullYear()) - gradeOffset(newStudent.value.grade), educationStage: stageForGrade(newStudent.value.grade), status: 'active', grade: newStudent.value.grade.trim(), className: newStudent.value.className.trim(), riskLevel: newStudent.value.riskLevel,
      emergencyContact: { name: newStudent.value.contactName.trim() || '未填写', relation: newStudent.value.relation.trim() || '监护人', phone: newStudent.value.phone.trim() || '未填写' },
      tags: newStudent.value.tags.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean),
    })
    isAdding.value = false
    resetNewStudent()
    workbench.selectedStudentId = student.id
    workbench.notifyStudentsChanged()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存学生失败，请重试。'
  }
}

watch(() => workbench.studentVersion, loadStudents)
watch(grade, () => { if (className.value && !classOptions.value.includes(className.value)) className.value = '' })
onMounted(async () => { crisisConfig.load(); await schoolConfig.load(); resetNewStudent(); await loadStudents() })
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="space-y-3 border-b border-stone-100 p-4">
      <div class="flex items-center justify-between gap-2"><span class="text-sm font-semibold text-stone-800">学生档案</span><span class="flex gap-1"><button class="rounded-lg border px-2 py-1 text-xs" type="button" @click="triggerImport">导入</button><input ref="fileInput" class="hidden" type="file" accept=".xlsx,.csv" @change="handleImportFile" /><button class="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800" type="button" @click="isAdding = true"><Plus :size="15" />新增</button></span></div>
      <label class="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2 text-sm text-stone-400"><Search :size="15" /><input v-model="keyword" class="w-full bg-transparent outline-none" placeholder="搜索姓名、学号或标签" /></label>
      <div class="grid grid-cols-3 gap-2"><select v-model="grade" class="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-600"><option value="">全部年级</option><option v-for="item in gradeOptions" :key="item" :value="item">{{ item }}</option></select><select v-model="className" class="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-600"><option value="">全部班级</option><option v-for="item in classOptions" :key="item" :value="item">{{ item }}</option></select><select v-model="riskLevel" class="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-600"><option value="">全部预警</option><option v-for="item in riskOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></div><div class="flex items-center justify-between gap-2"><label class="flex items-center gap-2 text-xs text-stone-600"><input v-model="includeGraduated" type="checkbox" class="accent-teal-700" />包含非在读学生</label><button class="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-xs font-medium text-stone-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800" type="button" :title="riskSort === 'desc' ? '当前：危机程度从高到低，点击切换为从低到高' : '当前：危机程度从低到高，点击切换为从高到低'" @click="toggleRiskSort"><ArrowDownUp :size="13" />危机：{{ riskSort === 'desc' ? '高→低' : '低→高' }}</button></div>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto p-3">
      <p v-if="isLoading" class="p-4 text-center text-sm text-stone-400">正在读取学生档案…</p><p v-else-if="errorMessage" class="p-4 text-center text-sm text-rose-600">{{ errorMessage }}</p><p v-else-if="filteredStudents.length === 0" class="p-4 text-center text-sm text-stone-400">没有符合条件的学生。</p>
      <button v-for="student in filteredStudents" v-else :key="student.id" class="mb-2 w-full rounded-xl border p-3 text-left transition hover:border-teal-300 hover:bg-teal-50" :class="workbench.selectedStudentId === student.id ? 'border-teal-400 bg-teal-50 shadow-sm' : 'border-stone-200 bg-white'" type="button" @click="selectStudent(student)">
        <div class="flex items-start justify-between gap-2"><div class="flex min-w-0 items-center gap-2"><span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500"><UserRound :size="16" /></span><div class="min-w-0"><p class="truncate text-sm font-semibold text-stone-800">{{ student.name }} <span class="ml-1 text-xs font-normal text-stone-400">{{ student.gender === 'male' ? '♂' : student.gender === 'female' ? '♀' : '○' }}</span></p><p class="mt-0.5 truncate text-xs text-stone-500">{{ student.studentNo }} · {{ studentGrade(student) }}{{ student.className }}</p></div></div><div class="flex shrink-0 flex-col items-end gap-1"><span v-if="student.status !== 'active'" class="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">{{ student.status === 'graduated' ? '已毕业' : student.status === 'transferred' ? '已转出' : '休学' }}</span><span class="rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset" :style="{ backgroundColor: `${riskBadge(student).color}18`, color: riskBadge(student).color, '--tw-ring-color': `${riskBadge(student).color}55` }">{{ riskBadge(student).emoji }} {{ riskBadge(student).label }}</span></div></div>
      </button>
    </div>
  </div>

  <Teleport to="body"><div v-if="isAdding" class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 p-4" @click.self="isAdding = false"><form class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" @submit.prevent="createStudent"><div class="flex items-center justify-between"><h2 class="text-base font-semibold">新增学生</h2><button type="button" class="rounded-lg p-1 text-stone-400 hover:bg-stone-100" @click="isAdding = false"><X :size="18" /></button></div><p v-if="errorMessage" class="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">{{ errorMessage }}</p><div class="mt-4 grid grid-cols-2 gap-3 text-sm"><label>姓名<input v-model="newStudent.name" required class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label>学号<input v-model="newStudent.studentNo" required class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label>年级<select v-model="newStudent.grade" required class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"><option v-for="item in gradeOptions" :key="item">{{ item }}</option></select></label><label>班级<select v-model="newStudent.className" required class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"><option v-for="item in schoolConfig.classesForGrade(newStudent.grade)" :key="item">{{ item }}</option></select></label><label>性别<select v-model="newStudent.gender" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"><option value="female">女</option><option value="male">男</option><option value="other">其他</option></select></label><label>危机评级<select v-model="newStudent.riskLevel" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"><option v-for="item in riskOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label><label>紧急联系人<input v-model="newStudent.contactName" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label>联系电话<input v-model="newStudent.phone" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="col-span-2">快捷标签（逗号分隔）<input v-model="newStudent.tags" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" placeholder="如：学业焦虑，人际敏感" /></label></div><div class="mt-5 flex justify-end gap-2"><button type="button" class="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100" @click="isAdding = false">取消</button><button class="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">保存学生</button></div></form></div></Teleport>
  <BatchImportModal v-if="isImporting" :selected-file="importFile" @close="isImporting = false; importFile = null" @imported="workbench.notifyStudentsChanged(); importFile = null" />
</template>
