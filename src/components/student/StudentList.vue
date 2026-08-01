<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, Search, UserRound, X } from '@lucide/vue'
import { studentService } from '../../services/studentService'
import { useWorkbenchStore } from '../../stores/workbench'
import type { RiskLevel, Student } from '../../types/schema'

const workbench = useWorkbenchStore()
/** 全量数据源：筛选选项永远只能从这里计算。 */
const allStudents = ref<Student[]>([])
const isAdding = ref(false)
const grade = ref('')
const className = ref('')
const riskLevel = ref<RiskLevel | ''>('')
const isLoading = ref(true)
const errorMessage = ref('')
const newStudent = ref({ name: '', studentNo: '', gender: 'female' as Student['gender'], grade: '初一', className: '1班', contactName: '', relation: '家长', phone: '', riskLevel: 'normal' as RiskLevel, tags: '' })

const gradeOptions = computed(() => [...new Set(allStudents.value.map((student) => student.grade).filter(Boolean))].sort())
const classOptions = computed(() => [...new Set(allStudents.value.filter((student) => !grade.value || student.grade === grade.value).map((student) => student.className).filter(Boolean))].sort())
const keyword = computed({ get: () => workbench.globalSearch, set: (value: string) => { workbench.globalSearch = value } })

const riskLabel: Record<RiskLevel, string> = { normal: '正常', attention: '关注', warning: '重点关注', crisis: '危机预警' }
const riskClass: Record<RiskLevel, string> = { normal: 'bg-emerald-50 text-emerald-700 ring-emerald-200', attention: 'bg-amber-50 text-amber-700 ring-amber-200', warning: 'bg-orange-50 text-orange-700 ring-orange-200', crisis: 'bg-rose-50 text-rose-700 ring-rose-200' }
const filteredStudents = computed(() => {
  const search = keyword.value.trim().toLocaleLowerCase()
  return allStudents.value.filter((student) =>
    (!grade.value || student.grade === grade.value)
    && (!className.value || student.className === className.value)
    && (!riskLevel.value || student.riskLevel === riskLevel.value)
    && (!search || [student.name, student.studentNo, ...student.tags].join(' ').toLocaleLowerCase().includes(search)),
  )
})

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
function resetNewStudent() { newStudent.value = { name: '', studentNo: '', gender: 'female', grade: '初一', className: '1班', contactName: '', relation: '家长', phone: '', riskLevel: 'normal', tags: '' } }

async function createStudent() {
  if (!newStudent.value.name.trim() || !newStudent.value.studentNo.trim()) return
  const student = await studentService.create({
    name: newStudent.value.name.trim(), studentNo: newStudent.value.studentNo.trim(), gender: newStudent.value.gender, grade: newStudent.value.grade.trim(), className: newStudent.value.className.trim(), riskLevel: newStudent.value.riskLevel,
    emergencyContact: { name: newStudent.value.contactName.trim() || '未填写', relation: newStudent.value.relation.trim() || '监护人', phone: newStudent.value.phone.trim() || '未填写' },
    tags: newStudent.value.tags.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean),
  })
  isAdding.value = false
  resetNewStudent()
  workbench.selectedStudentId = student.id
  workbench.notifyStudentsChanged()
}

watch(() => workbench.studentVersion, loadStudents)
watch(grade, () => { if (className.value && !classOptions.value.includes(className.value)) className.value = '' })
onMounted(loadStudents)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="space-y-3 border-b border-stone-100 p-4">
      <div class="flex items-center justify-between gap-2"><span class="text-sm font-semibold text-stone-800">学生档案</span><button class="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800" type="button" @click="isAdding = true"><Plus :size="15" />新增学生</button></div>
      <label class="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2 text-sm text-stone-400"><Search :size="15" /><input v-model="keyword" class="w-full bg-transparent outline-none" placeholder="搜索姓名、学号或标签" /></label>
      <div class="grid grid-cols-3 gap-2"><select v-model="grade" class="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-600"><option value="">全部年级</option><option v-for="item in gradeOptions" :key="item" :value="item">{{ item }}</option></select><select v-model="className" class="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-600"><option value="">全部班级</option><option v-for="item in classOptions" :key="item" :value="item">{{ item }}</option></select><select v-model="riskLevel" class="min-w-0 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-600"><option value="">全部预警</option><option value="normal">正常</option><option value="attention">关注</option><option value="warning">重点关注</option><option value="crisis">危机预警</option></select></div>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto p-3">
      <p v-if="isLoading" class="p-4 text-center text-sm text-stone-400">正在读取学生档案…</p><p v-else-if="errorMessage" class="p-4 text-center text-sm text-rose-600">{{ errorMessage }}</p><p v-else-if="filteredStudents.length === 0" class="p-4 text-center text-sm text-stone-400">没有符合条件的学生。</p>
      <button v-for="student in filteredStudents" v-else :key="student.id" class="mb-2 w-full rounded-xl border p-3 text-left transition hover:border-teal-300 hover:bg-teal-50" :class="workbench.selectedStudentId === student.id ? 'border-teal-400 bg-teal-50 shadow-sm' : 'border-stone-200 bg-white'" type="button" @click="selectStudent(student)">
        <div class="flex items-start justify-between gap-2"><div class="flex min-w-0 items-center gap-2"><span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500"><UserRound :size="16" /></span><div class="min-w-0"><p class="truncate text-sm font-semibold text-stone-800">{{ student.name }} <span class="ml-1 text-xs font-normal text-stone-400">{{ student.gender === 'male' ? '♂' : student.gender === 'female' ? '♀' : '○' }}</span></p><p class="mt-0.5 truncate text-xs text-stone-500">{{ student.studentNo }} · {{ student.grade }}{{ student.className }}</p></div></div><span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset" :class="riskClass[student.riskLevel]">{{ riskLabel[student.riskLevel] }}</span></div>
      </button>
    </div>
  </div>

  <Teleport to="body"><div v-if="isAdding" class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 p-4" @click.self="isAdding = false"><form class="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" @submit.prevent="createStudent"><div class="flex items-center justify-between"><h2 class="text-base font-semibold">新增学生</h2><button type="button" class="rounded-lg p-1 text-stone-400 hover:bg-stone-100" @click="isAdding = false"><X :size="18" /></button></div><div class="mt-4 grid grid-cols-2 gap-3 text-sm"><label>姓名<input v-model="newStudent.name" required class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label>学号<input v-model="newStudent.studentNo" required class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label>年级<input v-model="newStudent.grade" required class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label>班级<input v-model="newStudent.className" required class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label>性别<select v-model="newStudent.gender" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"><option value="female">女</option><option value="male">男</option><option value="other">其他</option></select></label><label>危机预警等级<select v-model="newStudent.riskLevel" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"><option value="normal">正常</option><option value="attention">关注</option><option value="warning">重点关注</option><option value="crisis">危机预警</option></select></label><label>紧急联系人<input v-model="newStudent.contactName" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label>联系电话<input v-model="newStudent.phone" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="col-span-2">快捷标签（逗号分隔）<input v-model="newStudent.tags" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" placeholder="如：学业焦虑，人际敏感" /></label></div><div class="mt-5 flex justify-end gap-2"><button type="button" class="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100" @click="isAdding = false">取消</button><button class="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">保存学生</button></div></form></div></Teleport>
</template>
