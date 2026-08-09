<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ClipboardPlus, Plus, Settings2, X } from '@lucide/vue'
import { useConsultationStore } from '../../stores/useConsultationStore'
import { useConsultationTemplateStore } from '../../stores/useConsultationTemplateStore'
import { useCategoryStore } from '../../stores/useCategoryStore'
import { useTermStore } from '../../stores/useTermStore'
import { studentService } from '../../services/studentService'
import { db } from '../../db'
import { getStudentGrade } from '../../utils/academic'
import { useWorkbenchStore } from '../../stores/workbench'
import { focusModalField } from '../../utils/focusModalField'
import { useCrisisConfigStore } from '../../stores/useCrisisConfigStore'
import type { ConsultationRecord, RiskLevel, SoapField, Student } from '../../types/schema'

const props = defineProps<{ editingId: string | null }>()
const emit = defineEmits<{ saved: [] }>()
const consultationStore = useConsultationStore()
const templateStore = useConsultationTemplateStore()
const categoryStore = useCategoryStore()
const termStore = useTermStore()
const workbench = useWorkbenchStore()
const crisisConfig = useCrisisConfigStore()
const students = ref<Student[]>([])
const studentSearch = ref('')
const isStudentLocked = ref(false)
const errorMessage = ref('')
const isSaving = ref(false)
const newWord = ref('')
const newCategory = ref('')
const editingTemplate = ref<SoapField | null>(null)
const templateDraft = ref('')
const riskOptions = computed(() => crisisConfig.getDropdownOptions())
const soapSections: Array<{ key: SoapField; title: string }> = [
  { key: 'subjective', title: 'S · 主观陈述' }, { key: 'objective', title: 'O · 客观观察' },
  { key: 'assessment', title: 'A · 评估分析' }, { key: 'plan', title: 'P · 后续计划' },
]
const form = reactive({
  studentId: '', date: new Date().toISOString().slice(0, 10), appointmentAt: '', durationMinutes: 40, sessionIndex: 1,
  visitType: 'active' as ConsultationRecord['visitType'], problemCategories: [] as string[], riskLevel: 'normal' as RiskLevel,
  soap: { subjective: '', objective: '', assessment: '', plan: '' },
})
const selectedStudent = computed(() => students.value.find((student) => student.id === form.studentId))
const matchingStudents = computed(() => {
  const keyword = studentSearch.value.trim()
  return keyword ? students.value.filter((student) => [student.name, student.studentNo].join(' ').includes(keyword)).slice(0, 8) : []
})

function reset(record?: ConsultationRecord) {
  errorMessage.value = ''
  isStudentLocked.value = false
  const student = record ? students.value.find((item) => item.id === record.studentId) : undefined
  Object.assign(form, record
    ? { studentId: record.studentId, date: record.date, appointmentAt: record.appointmentAt ?? '', durationMinutes: record.durationMinutes, sessionIndex: record.sessionIndex ?? 1, visitType: record.visitType, problemCategories: [...record.problemCategories], riskLevel: record.riskLevelAtTime ?? student?.riskLevel ?? 'normal', soap: { ...record.soap } }
    : { studentId: '', date: new Date().toISOString().slice(0, 10), appointmentAt: '', durationMinutes: 40, sessionIndex: 1, visitType: 'active', problemCategories: [], riskLevel: 'normal', soap: { subjective: '', objective: '', assessment: '', plan: '' } })
  studentSearch.value = student?.name ?? ''
}
async function chooseStudent(student: Student) {
  const current = await studentService.getById(student.id) ?? student
  const records = await studentService.getConsultations(current.id)
  form.studentId = current.id
  form.riskLevel = current.riskLevel
  form.sessionIndex = records.length + 1
  studentSearch.value = current.name
}
function toggleCategory(category: string) { form.problemCategories = form.problemCategories.includes(category) ? form.problemCategories.filter((item) => item !== category) : [...form.problemCategories, category] }
function append(field: SoapField, text: string) { form.soap[field] = [form.soap[field].trim(), text].filter(Boolean).join(form.soap[field].trim() ? '\n' : '') }
function insertTemplate(field: SoapField) { append(field, templateStore.templates[field]) }
function openTemplateEditor(field: SoapField) { editingTemplate.value = field; templateDraft.value = templateStore.templates[field] }
async function saveTemplate() { if (!editingTemplate.value) return; await templateStore.saveTemplate(editingTemplate.value, templateDraft.value); editingTemplate.value = null }
async function addWord() { if (await templateStore.addObservationWord(newWord.value)) newWord.value = '' }
async function addCategory() { if (await categoryStore.addCategory(newCategory.value)) newCategory.value = '' }
async function deleteCategory(category: string) { if (await categoryStore.deleteCategory(category)) form.problemCategories = form.problemCategories.filter((item) => item !== category) }
function closeModal() { consultationStore.closeForm(); reset() }
async function handleSubmit() {
  const termId = termStore.currentTermId
  if (!form.studentId) { errorMessage.value = '请从搜索结果中选择一名学生。'; return }
  if (!termId) { errorMessage.value = '当前未选择学期，暂不能保存。'; return }
  if (!form.date) { errorMessage.value = '请填写咨询日期。'; return }
  isSaving.value = true; errorMessage.value = ''
  try {
    const draft = { studentId: form.studentId, termId, date: form.date, appointmentAt: form.appointmentAt || undefined, durationMinutes: Number(form.durationMinutes) || 40, sessionIndex: Number(form.sessionIndex) || 1, visitType: form.visitType, problemCategories: [...form.problemCategories], soap: { ...form.soap }, isEncrypted: false }
    if (props.editingId) await consultationStore.updateConsultation(props.editingId, draft, form.riskLevel)
    else await consultationStore.addConsultation(draft, form.riskLevel)
    students.value = await studentService.list()
    emit('saved')
    closeModal()
  } catch (error) {
    console.error('保存咨询记录失败:', error)
    errorMessage.value = '保存失败，请确认已选择学生并检查字段填写后重试。'
  } finally { isSaving.value = false }
}
onMounted(async () => {
  crisisConfig.load()
  await Promise.all([templateStore.load(), categoryStore.load(), (async () => { students.value = await studentService.list() })()])
  const editing = props.editingId ? await db.consultations.get(props.editingId) : undefined
  reset(editing)
  const context = !editing ? workbench.pendingConsultationContext : null
  const pendingStudentId = context?.studentId ?? workbench.pendingConsultationStudentId
  const pendingStudent = pendingStudentId ? students.value.find((student) => student.id === pendingStudentId) : undefined
  if (pendingStudent) {
    await chooseStudent(pendingStudent)
    isStudentLocked.value = true
    if (context) {
      form.visitType = context.visitType ?? form.visitType
      form.problemCategories = [...new Set(context.problemCategories ?? form.problemCategories)]
      form.soap.subjective = context.subjective ?? form.soap.subjective
    }
  }
  workbench.pendingConsultationStudentId = null
  workbench.pendingConsultationContext = null
  await focusModalField()
})
watch(() => props.editingId, async (id) => reset(id ? await db.consultations.get(id) : undefined))
watch(studentSearch, (value) => { if (selectedStudent.value && value !== selectedStudent.value.name) form.studentId = '' })
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 bg-stone-950/30" @click.self="closeModal">
      <div class="ml-auto flex h-full w-full max-w-4xl flex-col overflow-y-auto bg-white p-6 shadow-2xl">
        <header class="flex items-start justify-between gap-4">
          <div><h2 class="text-lg font-semibold text-stone-800">{{ editingId ? '编辑个体咨询记录' : '新增个体咨询记录' }}</h2><p class="mt-1 text-sm text-stone-500">SOAP 结构化记录仅保存在本机。</p></div>
          <button type="button" aria-label="关闭" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" @click="closeModal"><X :size="18" /></button>
        </header>
        <p v-if="errorMessage" class="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{{ errorMessage }}</p>

        <div class="mt-5 grid gap-4 md:grid-cols-3">
          <div class="relative md:col-span-2"><label class="text-sm font-medium text-stone-700">学生选择<input v-model="studentSearch" :disabled="isStudentLocked" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 disabled:cursor-not-allowed disabled:bg-stone-50" placeholder="搜索姓名或学号" /></label><div v-if="studentSearch && studentSearch !== selectedStudent?.name && !isStudentLocked" class="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg"><button v-for="student in matchingStudents" :key="student.id" type="button" class="block w-full px-3 py-2 text-left text-sm hover:bg-teal-50" @click="chooseStudent(student)">{{ student.name }} · {{ student.studentNo }} · {{ getStudentGrade(student, termStore.currentTerm) }}{{ student.className }}</button><p v-if="matchingStudents.length === 0" class="px-3 py-2 text-sm text-stone-400">未找到匹配学生</p></div><p v-if="selectedStudent" class="mt-1 text-xs text-teal-700">{{ getStudentGrade(selectedStudent, termStore.currentTerm) }}{{ selectedStudent.className }} · 当前预警：{{ crisisConfig.getStudentWarningBadge(selectedStudent.warningLevel ?? selectedStudent.riskLevel).emoji }} {{ crisisConfig.getStudentWarningBadge(selectedStudent.warningLevel ?? selectedStudent.riskLevel).label }}<span v-if="isStudentLocked"> · 已从业务上下文锁定</span></p></div>
          <label class="text-sm font-medium text-stone-700">咨询日期<input v-model="form.date" type="date" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
          <label class="text-sm font-medium text-stone-700">预约时间（用于提醒）<input v-model="form.appointmentAt" type="datetime-local" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
          <label class="text-sm font-medium text-stone-700">咨询时长（分钟）<input v-model.number="form.durationMinutes" min="1" type="number" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label>
          <label class="text-sm font-medium text-stone-700">咨询次数（可修改）<input v-model.number="form.sessionIndex" min="1" type="number" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /><span class="mt-1 block text-xs text-blue-600">第 {{ form.sessionIndex || 1 }} 次</span></label>
          <label class="text-sm font-medium text-stone-700">危机评级<select v-model="form.riskLevel" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2"><option v-for="item in riskOptions" :key="item.value" :value="item.riskValue">{{ item.emoji }} {{ item.label }}</option></select></label>
        </div>

        <fieldset class="mt-5"><legend class="text-sm font-medium text-stone-700">来访类型</legend><div class="mt-2 flex flex-wrap gap-4 text-sm"><label><input v-model="form.visitType" type="radio" value="active" class="mr-1 accent-teal-700" />主动来访</label><label><input v-model="form.visitType" type="radio" value="referral" class="mr-1 accent-teal-700" />教师转介</label><label><input v-model="form.visitType" type="radio" value="census_followup" class="mr-1 accent-teal-700" />普查约访</label></div></fieldset>
        <fieldset class="mt-5"><legend class="text-sm font-medium text-stone-700">问题分类</legend><div class="mt-2 flex flex-wrap gap-2"><label v-for="category in categoryStore.categories" :key="category" class="inline-flex items-center gap-1 rounded-full border py-1.5 pl-3 pr-1.5 text-xs" :class="form.problemCategories.includes(category) ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-stone-200 text-stone-600'"><input class="sr-only" type="checkbox" :checked="form.problemCategories.includes(category)" @change="toggleCategory(category)" /><span>{{ category }}</span><button type="button" :disabled="(categoryStore.usageCount[category] ?? 0) > 0" :title="(categoryStore.usageCount[category] ?? 0) > 0 ? '该分类已有关联咨询记录，不能删除' : `删除分类 ${category}`" class="rounded-full px-1 text-stone-400 hover:bg-stone-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-35" @click.stop.prevent="deleteCategory(category)"><X :size="12" /></button></label></div><p class="mt-2 text-xs text-stone-400">已有咨询记录引用的分类会锁定保留，确保历史档案可追溯。</p><div class="mt-2 flex max-w-sm gap-2"><input v-model="newCategory" class="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs" placeholder="新增分类，例如：睡眠困扰" @keyup.enter="addCategory" /><button type="button" class="inline-flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-teal-300 px-2.5 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50" @click="addCategory"><Plus :size="13" />新增分类</button></div></fieldset>

        <div class="mt-5 grid gap-4"><section v-for="section in soapSections" :key="section.key" class="rounded-xl border border-stone-100 p-4"><div class="flex flex-wrap items-center justify-between gap-2"><label class="text-sm font-semibold text-stone-800">{{ section.title }}</label></div><div v-if="section.key === 'objective'" class="mt-3 flex flex-wrap items-center gap-1.5"><span v-for="word in templateStore.observationWords" :key="word" class="inline-flex items-center rounded-full bg-stone-100 py-1 pl-2.5 pr-1 text-xs text-stone-600"><button type="button" @click="append('objective', word)">{{ word }}</button><button type="button" :aria-label="`删除常用词 ${word}`" class="ml-1 rounded-full px-1 text-stone-400 hover:bg-stone-200 hover:text-rose-600" @click="templateStore.deleteObservationWord(word)"><X :size="12" /></button></span><div class="flex items-center gap-1"><input v-model="newWord" class="w-28 rounded-full border border-stone-200 px-2 py-1 text-xs" placeholder="新增常用词" @keyup.enter="addWord" /><button type="button" class="inline-flex items-center gap-0.5 rounded-full border border-dashed border-teal-300 px-2 py-1 text-xs text-teal-700 hover:bg-teal-50" @click="addWord"><Plus :size="12" />新增常用词</button></div></div><div class="relative mt-3"><textarea v-model="form.soap[section.key]" rows="4" class="w-full rounded-lg border border-stone-200 p-3 pr-28 pt-8 text-sm leading-6" /><div class="absolute right-2 top-2 flex items-center gap-2"><button type="button" class="inline-flex items-center gap-0.5 text-xs text-slate-400 hover:text-emerald-600" @click="insertTemplate(section.key)"><ClipboardPlus :size="12" />插入模板</button><button type="button" class="inline-flex items-center gap-0.5 text-xs text-slate-400 hover:text-emerald-600" @click="openTemplateEditor(section.key)"><Settings2 :size="12" />编辑模板</button></div></div></section></div>
        <footer class="mt-6 flex justify-end gap-2 border-t border-stone-100 pt-5"><button type="button" class="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100" @click="closeModal">取消</button><button type="button" :disabled="isSaving" class="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60" @click="handleSubmit">{{ isSaving ? '保存中…' : '保存记录' }}</button></footer>
        <div v-if="editingTemplate" class="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/30 p-4"><div class="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"><h3 class="text-base font-semibold text-stone-800">编辑 {{ soapSections.find((item) => item.key === editingTemplate)?.title }} 模版</h3><p class="mt-1 text-sm text-stone-500">修改后会保存到本机，后续咨询可直接插入。</p><textarea v-model="templateDraft" rows="8" class="mt-4 w-full rounded-lg border border-stone-200 p-3 text-sm leading-6" /><div class="mt-4 flex justify-end gap-2"><button type="button" class="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100" @click="editingTemplate = null">取消</button><button type="button" class="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white" @click="saveTemplate">保存模版</button></div></div></div>
      </div>
    </div>
  </Teleport>
</template>
