<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import * as XLSX from 'xlsx'
import { studentService } from '../../services/studentService'
import { useSchoolConfigStore } from '../../stores/useSchoolConfigStore'
import { useTermStore } from '../../stores/useTermStore'
import { STAGE_GRADES } from '../../constants/grades'
import type { Student } from '../../types/schema'
import { focusModalField } from '../../utils/focusModalField'

const emit = defineEmits<{ close: []; imported: [] }>()
const termStore = useTermStore(); const schoolConfig = useSchoolConfigStore()
const importGrade = ref(''); const rows = ref<Array<{ student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>; error?: string }>>([])
const enrollmentYear = computed(() => Number(termStore.currentTerm?.academicYear.split('-')[0] ?? new Date().getFullYear()) - gradeOffset(importGrade.value))
const classOptions = computed(() => schoolConfig.classesForGrade(importGrade.value))
function stageForGrade(grade: string) { return (Object.entries(STAGE_GRADES).find(([, grades]) => grades.includes(grade as never))?.[0] ?? 'junior') as Student['educationStage'] }
function gradeOffset(grade: string) { return Object.values(STAGE_GRADES).find((grades) => grades.includes(grade as never))?.indexOf(grade as never) ?? 0 }
function template() {
  const sheet = XLSX.utils.json_to_sheet([{ 学号: '20250001', 姓名: '示例学生', 性别: '女', 班级: '1班', 紧急联系人: '家长', 联系电话: '13800000000', 标签: '学业关注' }])
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, `${importGrade.value || '学生'}导入`); XLSX.writeFile(book, `${importGrade.value || '学生'}导入模板.xlsx`)
}
async function read(file: File) {
  const data = await file.arrayBuffer(); const workbook = XLSX.read(data); const sheet = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' })
  const existing = await studentService.list(); const seen = new Set(existing.map((student) => student.studentNo))
  rows.value = sheet.map((row) => {
    const className = String(row.班级).trim()
    const student = {
      studentNo: String(row.学号).trim(), name: String(row.姓名).trim(), gender: (row.性别 === '男' ? 'male' : row.性别 === '女' ? 'female' : 'other') as Student['gender'],
      enrollmentYear: enrollmentYear.value, educationStage: stageForGrade(importGrade.value), status: 'active' as const, grade: importGrade.value, className,
      emergencyContact: { name: String(row.紧急联系人).trim() || '未填写', relation: '监护人', phone: String(row.联系电话).trim() || '未填写' }, riskLevel: 'normal' as const,
      tags: String(row.标签).split(/[，,]/).map((item) => item.trim()).filter(Boolean),
    }
    const error = !student.studentNo || !student.name || !className ? '缺少必填项' : !classOptions.value.includes(className) ? '班级不在当前学校配置范围内' : seen.has(student.studentNo) ? '学号重复' : ''
    seen.add(student.studentNo); return { student, error: error || undefined }
  })
}
async function confirm() { const valid = rows.value.filter((row) => !row.error).map((row) => row.student); if (valid.length) await studentService.importStudents(valid); emit('imported'); emit('close') }
watch(importGrade, () => { rows.value = [] })
onMounted(async () => { await schoolConfig.load(); importGrade.value = schoolConfig.enabledGrades[0] ?? '初一'; await focusModalField() })
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 p-4"><section class="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl"><div class="flex items-center justify-between"><h2 class="font-semibold">批量导入学生</h2><button class="text-sm text-stone-500" @click="emit('close')">关闭</button></div><p class="mt-2 text-sm text-stone-500">文件只在本机解析。选择年级后，系统会按当前学年自动换算入学年份。</p><div class="mt-4 flex flex-wrap items-end gap-3"><label class="text-sm font-medium text-stone-700">导入年级<select v-model="importGrade" class="mt-1 block rounded-lg border border-stone-200 px-3 py-2 text-sm"><option v-for="grade in schoolConfig.enabledGrades" :key="grade">{{ grade }}</option></select></label><p class="pb-2 text-sm text-stone-500">对应入学年份：{{ enrollmentYear }} · 可选班级：{{ classOptions.join('、') }}</p></div><div class="mt-4 flex gap-3"><button class="rounded-lg border px-3 py-2 text-sm" @click="template">下载模板</button><label class="rounded-lg bg-teal-700 px-3 py-2 text-sm text-white">选择 Excel / CSV<input class="hidden" type="file" accept=".xlsx,.csv" @change="read(($event.target as HTMLInputElement).files?.[0]!)" /></label></div><div v-if="rows.length" class="mt-4 max-h-64 overflow-auto rounded-lg border"><table class="w-full text-sm"><tr class="bg-stone-50 text-left"><th class="p-2">学号</th><th>姓名</th><th>年级班级</th><th>校验</th></tr><tr v-for="row in rows" :key="row.student.studentNo" :class="row.error ? 'bg-rose-50' : ''"><td class="p-2">{{ row.student.studentNo }}</td><td>{{ row.student.name }}</td><td>{{ row.student.grade }}{{ row.student.className }}</td><td>{{ row.error || '通过' }}</td></tr></table></div><button :disabled="!rows.length" class="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm text-white disabled:opacity-50" @click="confirm">确认导入</button></section></div>
</template>
