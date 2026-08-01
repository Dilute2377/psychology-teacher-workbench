<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, Search } from '@lucide/vue'
import { getConsultationCategoryLabel, matchesConsultationCategory, useConsultationStore } from '../../stores/useConsultationStore'
import { useCategoryStore } from '../../stores/useCategoryStore'
import { useTermStore } from '../../stores/useTermStore'
import { useWorkbenchStore } from '../../stores/workbench'
import { studentService } from '../../services/studentService'
import { getStudentGrade } from '../../utils/academic'
import type { Student } from '../../types/schema'

const consultationStore = useConsultationStore()
const categoryStore = useCategoryStore()
const termStore = useTermStore()
const workbench = useWorkbenchStore()
const students = ref<Student[]>([])
const keyword = ref('')
const category = ref('')
const visitType = ref('')
const visitLabels: Record<string, string> = { active: '主动来访', referral: '教师转介', census_followup: '普查约访' }
const studentById = computed(() => new Map(students.value.map((student) => [student.id, student])))
const records = computed(() => consultationStore.consultations.filter((record) => {
  const student = studentById.value.get(record.studentId)
  const matchSearch = !keyword.value.trim() || [student?.name, student?.studentNo].filter(Boolean).join(' ').includes(keyword.value.trim())
  return matchSearch && matchesConsultationCategory(record.problemCategories, category.value) && (!visitType.value || record.visitType === visitType.value)
}))
async function load() { students.value = await studentService.list(); await consultationStore.fetchConsultations() }
watch([() => termStore.currentTermId, () => workbench.studentVersion], () => void load())
onMounted(async () => { await categoryStore.load(); await load() })
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="space-y-3 border-b border-stone-100 p-4">
      <div class="flex items-center justify-between gap-2"><span class="text-sm font-semibold text-stone-800">咨询记录</span><button class="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800" type="button" @click="consultationStore.openForm()"><Plus :size="15" />新增咨询</button></div>
      <label class="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2 text-sm text-stone-400"><Search :size="15" /><input v-model="keyword" class="w-full bg-transparent outline-none" placeholder="搜索学生姓名或学号" /></label>
      <div class="grid grid-cols-2 gap-2"><select v-model="category" class="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-600"><option value="">全部分类</option><option v-for="item in categoryStore.categories" :key="item" :value="item">{{ item }}</option></select><select v-model="visitType" class="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-600"><option value="">全部来访</option><option value="active">主动来访</option><option value="referral">教师转介</option><option value="census_followup">普查约访</option></select></div>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto p-3"><p v-if="records.length === 0" class="p-5 text-center text-sm text-stone-400">当前学期暂无符合条件的咨询记录。</p><button v-for="record in records" v-else :key="record.id" class="mb-2 w-full rounded-xl border p-3 text-left transition hover:border-teal-300 hover:bg-teal-50" :class="consultationStore.selectedConsultationId === record.id ? 'border-teal-400 bg-teal-50 shadow-sm' : 'border-stone-200 bg-white'" @click="consultationStore.openDetail(record.id)"><div class="flex items-start justify-between gap-2"><div><p class="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-stone-800">{{ studentById.get(record.studentId)?.name ?? '未知学生' }}<span class="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">第 {{ record.sessionIndex ?? 1 }} 次</span></p><p class="mt-0.5 text-xs text-stone-500">{{ studentById.get(record.studentId)?.studentNo }} · {{ getStudentGrade(studentById.get(record.studentId)!, termStore.currentTerm) }}{{ studentById.get(record.studentId)?.className }}</p></div><time class="text-xs text-stone-400">{{ record.date }}</time></div><div class="mt-2 flex flex-wrap gap-1"><span v-for="item in record.problemCategories" :key="item" class="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">{{ getConsultationCategoryLabel(item) }}</span></div><p class="mt-2 text-xs text-stone-500">{{ visitLabels[record.visitType] }} · {{ record.durationMinutes }}分钟</p></button></div>
  </div>
</template>
