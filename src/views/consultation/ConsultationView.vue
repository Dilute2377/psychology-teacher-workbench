<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { ClipboardList, PencilLine, Trash2, UserRound } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { getConsultationCategoryLabel, useConsultationStore } from '../../stores/useConsultationStore'
import { useTermStore } from '../../stores/useTermStore'
import { studentService } from '../../services/studentService'
import ConsultationFormModal from '../../components/consultation/ConsultationFormModal.vue'
import ConsultationDetailDrawer from '../../components/consultation/ConsultationDetailDrawer.vue'
import type { Student } from '../../types/schema'
import { ref } from 'vue'
import { getStudentGrade } from '../../utils/academic'
import { useWorkbenchStore } from '../../stores/workbench'

const consultationStore = useConsultationStore(); const termStore = useTermStore(); const workbench = useWorkbenchStore(); const router = useRouter(); const students = ref<Student[]>([])
const record = computed(() => consultationStore.selectedConsultation)
const student = computed(() => students.value.find((item) => item.id === record.value?.studentId))
const visitLabels: Record<string, string> = { active: '主动来访', referral: '教师转介', census_followup: '普查约访' }
async function load() { students.value = await studentService.list(); await consultationStore.fetchConsultations() }
async function remove() { if (record.value && window.confirm('确认删除这条本地咨询记录吗？')) await consultationStore.deleteConsultation(record.value.id) }
function openStudentProfile() { if (!record.value) return; workbench.selectedStudentId = record.value.studentId; router.push('/students') }
watch(() => termStore.currentTermId, () => void load()); watch(() => [workbench.pendingConsultationContext, workbench.pendingConsultationStudentId], ([context, studentId]) => { if ((context || studentId) && !consultationStore.isFormOpen) consultationStore.openForm() }); onMounted(async () => { await load(); if (workbench.pendingConsultationContext || workbench.pendingConsultationStudentId) consultationStore.openForm() })
</script>
<template>
  <section v-if="!record" class="flex h-full flex-col items-center justify-center p-8 text-center"><span class="flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><ClipboardList :size="25" /></span><h1 class="mt-4 text-lg font-semibold text-stone-800">个体咨询</h1><p class="mt-2 text-sm text-stone-500">请从中间列表选择一条咨询记录，或新建 SOAP 记录。</p></section>
  <section v-else class="flex h-full min-h-0 flex-col overflow-hidden"><header class="shrink-0 border-b border-stone-200 p-6"><div class="flex flex-wrap items-start justify-between gap-4"><div><p class="text-xs font-medium text-teal-700">{{ visitLabels[record.visitType] }}</p><h1 class="mt-1 text-xl font-semibold text-stone-800">{{ student?.name ?? '学生档案' }}的第 {{ record.sessionIndex ?? 1 }} 次个体咨询</h1><p class="mt-1 text-sm text-stone-500">{{ record.date }} · {{ record.durationMinutes }}分钟 · {{ student ? `${getStudentGrade(student, termStore.currentTerm)}${student.className}` : '' }}</p></div><div class="flex flex-wrap gap-2"><button class="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800 hover:bg-teal-100" @click="openStudentProfile"><UserRound :size="15" />查看学生档案</button><button class="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50" @click="consultationStore.openForm(record.id)"><PencilLine :size="15" />编辑</button><button class="rounded-lg p-2 text-rose-600 hover:bg-rose-50" @click="remove"><Trash2 :size="16" /></button></div></div><div class="mt-4 flex flex-wrap gap-2"><span class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">第 {{ record.sessionIndex ?? 1 }} 次</span><span v-for="item in record.problemCategories" :key="item" class="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">{{ getConsultationCategoryLabel(item) }}</span></div></header><div class="min-h-0 flex-1 overflow-y-auto p-6"><div class="mx-auto max-w-3xl space-y-4"><article v-for="section in [{key:'subjective',label:'S · 主观陈述',text:record.soap.subjective},{key:'objective',label:'O · 客观观察',text:record.soap.objective},{key:'assessment',label:'A · 评估分析',text:record.soap.assessment},{key:'plan',label:'P · 后续计划',text:record.soap.plan}]" :key="section.key" class="rounded-xl border border-stone-200 p-4"><h2 class="text-sm font-semibold text-stone-800">{{ section.label }}</h2><p class="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-600">{{ section.text || '未填写' }}</p></article></div></div></section>
  <ConsultationFormModal v-if="consultationStore.isFormOpen" :editing-id="consultationStore.editingConsultationId" @saved="load" />
  <ConsultationDetailDrawer v-if="record && consultationStore.isDetailOpen && !consultationStore.isFormOpen" :record="record" :student-name="student?.name" @close="consultationStore.closeDetail" />
</template>
