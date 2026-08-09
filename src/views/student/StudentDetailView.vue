<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { AlertTriangle, ChevronDown, ClipboardList, Eye, FileBarChart2, FileText, FileUp, History, Image as ImageIcon, PencilLine, Plus, Save, ShieldPlus, Trash2, UserRound, X } from '@lucide/vue'
import { db } from '../../db'
import StudentTimeline from '../../components/student/StudentTimeline.vue'
import ConsultationDetailDrawer from '../../components/consultation/ConsultationDetailDrawer.vue'
import ConsultationFormModal from '../../components/consultation/ConsultationFormModal.vue'
import GroupDetailDrawer from '../../components/group/GroupDetailDrawer.vue'
import WorkTrailDetailDrawer from '../../components/work-trail/WorkTrailDetailDrawer.vue'
import { studentService, type StudentCensusResult } from '../../services/studentService'
import { useWorkbenchStore } from '../../stores/workbench'
import { useTermStore } from '../../stores/useTermStore'
import { useConsultationStore } from '../../stores/useConsultationStore'
import { useStudentStore } from '../../stores/useStudentStore'
import { useCrisisConfigStore } from '../../stores/useCrisisConfigStore'
import StudentArchivePrintModal from '../../components/student/StudentArchivePrintModal.vue'
import type { ConsultationRecord, GroupActivity, LessonRecord, MedicalAttachment, RiskLevel, Student, WorkTrail } from '../../types/schema'
import { getStudentGrade } from '../../utils/academic'
import { formatCensusFactor, isCensusFactorFlagged } from '../../utils/census'
import { MAX_INLINE_ATTACHMENT_BYTES, prepareInlineAttachment } from '../../services/storageBoundary'

const workbench = useWorkbenchStore()
const termStore = useTermStore()
const consultationStore = useConsultationStore()
const studentStore = useStudentStore()
const crisisConfig = useCrisisConfigStore()
const student = ref<Student>()
const consultations = ref<ConsultationRecord[]>([])
const censusResults = ref<StudentCensusResult[]>([])
const detailRecord = ref<ConsultationRecord>()
const detailGroup = ref<GroupActivity>()
const detailWorkTrail = ref<WorkTrail>()
const detailRiskLevel = ref<RiskLevel>()
const loading = ref(false)
const activeTab = ref<'timeline' | 'consultations' | 'census' | 'work-trails' | 'edit'>('timeline')
const workTrails = ref<WorkTrail[]>([])
const editForm = reactive({ name: '', studentNo: '', gender: 'female' as Student['gender'], status: 'active' as Student['status'], manualGradeEnabled: false, manualGrade: '', className: '', dormNumber: '', contactName: '', relation: '', phone: '', tags: '' })
const riskOptions = computed(() => crisisConfig.getDropdownOptions())
const currentRiskBadge = computed(() => student.value ? crisisConfig.getStudentWarningBadge(student.value.warningLevel ?? student.value.riskLevel) : crisisConfig.getLevelBadge('normal'))
const tabs = [{ id: 'timeline', label: '服务履历', icon: History }, { id: 'consultations', label: '咨询历史', icon: ClipboardList }, { id: 'census', label: '普查数据', icon: FileBarChart2 }, { id: 'work-trails', label: '工作留痕', icon: ShieldPlus }, { id: 'edit', label: '档案编辑', icon: PencilLine }] as const
const hasStudent = computed(() => Boolean(student.value))
const displayedGrade = computed(() => student.value ? getStudentGrade(student.value, termStore.currentTerm) : '—')
const studentConsultations = computed(() => [...consultations.value].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)))
/** 学生档案永久展示全量普查历史，不能套用工作台当前学期过滤。 */
const studentCensusList = computed(() => [...censusResults.value].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)))
const consultationCount = computed(() => consultations.value.length)
const expandedConsultationIds = ref<string[]>([])
const newestConsultationId = ref<string | null>(null)
const expandedCensusIds = ref<string[]>([])
const newestCensusId = ref<string | null>(null)
const attachmentNote = ref('')
const attachmentError = ref('')
const medicalPreview = ref<MedicalAttachment>()
const medicalLightbox = ref<string>()
const savingAttachments = ref(false)
const showArchivePrint = ref(false)
const censusScoreTrends = computed(() => {
  const trends = new Map<string, number>()
  studentCensusList.value.forEach((result, index) => {
    const previous = studentCensusList.value.slice(index + 1).find((item) => item.scaleName === result.scaleName)
    if (!previous) return
    Object.entries(result.scores).forEach(([factor, score]) => {
      const previousScore = previous.scores[factor]
      if (Number.isFinite(Number(previousScore))) {
        const difference = Number(score) - Number(previousScore)
        if (difference !== 0) trends.set(`${result.id}:${factor}`, difference)
      }
    })
  })
  return trends
})

function fillEditForm(record: Student) { Object.assign(editForm, { name: record.name, studentNo: record.studentNo, gender: record.gender, status: record.status, manualGradeEnabled: Boolean(record.gradeOverride), manualGrade: record.gradeOverride ?? '', className: record.className, dormNumber: record.dormNumber ?? '', contactName: record.emergencyContact.name, relation: record.emergencyContact.relation, phone: record.emergencyContact.phone, tags: record.tags.join('，') }) }
async function loadStudent() { const id = workbench.selectedStudentId; if (!id) { student.value = undefined; consultations.value = []; censusResults.value = []; workTrails.value = []; return }; loading.value = true; student.value = await studentService.getById(id); if (student.value) { fillEditForm(student.value); const [records, census, trails] = await Promise.all([studentService.getConsultations(id), studentService.getCensusResults(id), db.workTrails.where('studentId').equals(id).toArray()]); consultations.value = records; censusResults.value = census; workTrails.value = trails.sort((a, b) => b.dateTime.localeCompare(a.dateTime)) }; loading.value = false }
async function changeRisk(event: Event) { if (!student.value) return; const selected = crisisConfig.getLevelBadge((event.target as HTMLSelectElement).value); const next = selected.riskValue as RiskLevel; await studentService.updateRiskLevel(student.value.id, next); student.value = await studentService.getById(student.value.id); workbench.notifyStudentsChanged() }
async function saveProfile() { if (!student.value) return; const manualGrade = editForm.manualGrade.trim(); const updated = await studentService.update(student.value.id, { name: editForm.name.trim(), studentNo: editForm.studentNo.trim(), gender: editForm.gender, status: editForm.status, grade: editForm.manualGradeEnabled ? manualGrade : student.value.grade, gradeOverride: editForm.manualGradeEnabled ? manualGrade : undefined, className: editForm.className.trim(), dormNumber: editForm.dormNumber.trim() || undefined, emergencyContact: { name: editForm.contactName.trim(), relation: editForm.relation.trim(), phone: editForm.phone.trim() }, tags: editForm.tags.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean) }); if (updated) { student.value = updated; fillEditForm(updated); workbench.notifyStudentsChanged() } }
async function deleteStudent() {
  if (!student.value || !window.confirm(`确认删除 ${student.value.name} 的本地档案吗？此操作不可撤销。`)) return
  try {
    await studentService.remove(student.value.id)
    student.value = undefined
    workbench.selectedStudentId = null
    workbench.notifyStudentsChanged()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : '该档案暂时无法删除。')
  }
}
function openConsultationDetail(record: ConsultationRecord) { detailRecord.value = record; detailRiskLevel.value = record.riskLevelAtTime ?? student.value?.riskLevel }
function openTimelineConsultation(record: ConsultationRecord) { openConsultationDetail(record) }
function startConsultation() { if (!student.value) return; workbench.pendingConsultationStudentId = student.value.id; consultationStore.openForm() }
function attachmentDate() { return new Date().toISOString().slice(0, 10) }
async function persistMedicalAttachments(next: MedicalAttachment[]) {
  if (!student.value) return
  savingAttachments.value = true
  try {
    const updated = await studentStore.saveMedicalAttachments(student.value.id, next)
    if (updated) student.value = updated
  } finally { savingAttachments.value = false }
}
async function handleMedicalFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  attachmentError.value = ''
  if (!files.length || !student.value) return
  const unsupported = files.find((file) => !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) && !/\.(pdf|jpe?g|png)$/i.test(file.name))
  if (unsupported) { attachmentError.value = '仅支持 PDF、JPG、JPEG、PNG 附件。'; return }
  try {
    const created: MedicalAttachment[] = []
    const errors: string[] = []
    for (const file of files) {
      try {
        const prepared = await prepareInlineAttachment(file, { maxBytes: MAX_INLINE_ATTACHMENT_BYTES, compressImages: true })
        created.push({ id: crypto.randomUUID(), name: file.name, type: prepared.kind === 'file' ? 'pdf' : prepared.kind as 'image', url: prepared.dataUrl, date: attachmentDate(), note: attachmentNote.value.trim() || file.name })
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `无法读取 ${file.name}`)
      }
    }
    if (created.length) await persistMedicalAttachments([...(student.value.medicalAttachments ?? []), ...created])
    if (errors.length) attachmentError.value = errors.join('；')
    attachmentNote.value = ''
  } catch (error) { attachmentError.value = error instanceof Error ? error.message : '附件读取失败，请重试。' }
}
async function updateMedicalAttachment(attachment: MedicalAttachment) { await persistMedicalAttachments([...(student.value?.medicalAttachments ?? [])].map((item) => item.id === attachment.id ? { ...item, note: attachment.note.trim() } : item)) }
async function removeMedicalAttachment(id: string) {
  if (!student.value || !window.confirm('确认删除这条就诊 / 会谈附件记录吗？')) return
  await persistMedicalAttachments((student.value.medicalAttachments ?? []).filter((item) => item.id !== id))
  if (medicalPreview.value?.id === id) medicalPreview.value = undefined
}
function openMedicalAttachment(attachment: MedicalAttachment) { if (attachment.type === 'pdf') medicalPreview.value = attachment; else medicalLightbox.value = attachment.url }
function exportDossier() { if (student.value) showArchivePrint.value = true }
function startLessonConsultation(record: LessonRecord) { if (!student.value) return; const observation = record.notableStudents.find((item) => item.studentId === student.value!.id); workbench.pendingConsultationContext = { studentId: student.value.id, visitType: 'referral', subjective: `【心理课课堂观察】${record.date}《${record.topic}》：${observation?.note || '需进一步了解课堂表现。'}` }; consultationStore.openForm() }
function toggleConsultation(recordId: string) { expandedConsultationIds.value = expandedConsultationIds.value.includes(recordId) ? expandedConsultationIds.value.filter((id) => id !== recordId) : [...expandedConsultationIds.value, recordId] }
function isCensusScoreFlagged(factor: string, score: number, reasons: string[]) { return isCensusFactorFlagged(factor, Number(score), reasons) }
function toggleCensus(resultId: string) { expandedCensusIds.value = expandedCensusIds.value.includes(resultId) ? expandedCensusIds.value.filter((id) => id !== resultId) : [...expandedCensusIds.value, resultId] }
function scoreTrend(resultId: string, factor: string) { return censusScoreTrends.value.get(`${resultId}:${factor}`) }

watch([() => workbench.selectedStudentId, () => workbench.studentVersion], () => void loadStudent())
watch(studentConsultations, (records) => {
  const latestId = records[0]?.id ?? null
  if (latestId !== newestConsultationId.value) { newestConsultationId.value = latestId; expandedConsultationIds.value = latestId ? [latestId] : [] }
}, { immediate: true })
watch(studentCensusList, (records) => {
  const latestId = records[0]?.id ?? null
  if (latestId !== newestCensusId.value) { newestCensusId.value = latestId; expandedCensusIds.value = latestId ? [latestId] : [] }
}, { immediate: true })
onMounted(loadStudent)
</script>

<template>
  <div v-if="loading" class="flex h-full items-center justify-center text-sm text-stone-400">正在读取学生综合心理档案…</div>
  <section v-else-if="!hasStudent" class="relative flex h-full flex-col items-center justify-center p-8 text-center"><nav class="absolute left-6 top-5 flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" aria-label="学生档案页签"><RouterLink to="/students" class="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm">👥 全校学生档案</RouterLink><RouterLink to="/students/key-students" class="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:text-emerald-800">📋 重点学生与个案总表</RouterLink></nav><span class="flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><UserRound :size="24" /></span><h1 class="mt-4 text-lg font-semibold text-stone-800">学生综合心理档案</h1><p class="mt-2 max-w-sm text-sm leading-6 text-stone-500">请从中间列表选择学生，查看心理服务与成长履历。</p></section>
  <section v-else class="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white"><nav class="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-slate-50/50 px-6 py-2" aria-label="学生档案页签"><RouterLink to="/students" class="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-800 shadow-sm">👥 全校学生档案</RouterLink><RouterLink to="/students/key-students" class="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:text-emerald-800">📋 重点学生与个案总表</RouterLink></nav><header class="shrink-0 border-b border-stone-200 p-6"><div class="flex flex-wrap items-start justify-between gap-4"><div class="flex items-center gap-3"><span class="flex size-12 items-center justify-center rounded-2xl bg-teal-100 text-xl font-bold text-teal-800">{{ student!.name.slice(0, 1) }}</span><div><div class="flex items-center gap-2"><h1 class="text-xl font-semibold text-stone-800">{{ student!.name }}</h1><span class="text-sm text-stone-400">{{ student!.gender === 'male' ? '♂ 男' : student!.gender === 'female' ? '♀ 女' : '○ 其他' }}</span></div><p class="mt-1 text-sm text-stone-500">{{ student!.studentNo }} · {{ displayedGrade }}{{ student!.className }}<span v-if="student!.dormNumber"> · {{ student!.dormNumber }}</span></p><p class="mt-1 text-xs font-medium text-teal-700">累计咨询 {{ consultationCount }} 次</p></div></div><div class="flex flex-wrap items-center gap-2"><button type="button" class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-teal-300 hover:text-teal-800" @click="exportDossier"><FileText :size="16" />导出单人完整档案卷宗</button><button type="button" class="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100" @click="startConsultation"><Plus :size="16" />发起个体咨询</button><label class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold" :style="{ backgroundColor: `${currentRiskBadge.color}18`, color: currentRiskBadge.color }"><AlertTriangle :size="16" />危机评级<select :value="crisisConfig.resolveLevelKey(student!.warningLevel ?? student!.riskLevel)" class="bg-transparent text-sm font-semibold outline-none" @change="changeRisk"><option v-for="item in riskOptions" :key="item.value" :value="item.value">{{ item.emoji }} {{ item.label }}</option></select></label></div></div><div class="mt-4 flex flex-wrap gap-2"><span v-for="tag in student!.tags" :key="tag" class="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">{{ tag }}</span><span v-if="student!.tags.length === 0" class="text-xs text-stone-400">暂无快捷标签</span></div><p class="mt-4 text-sm text-stone-600">紧急联系人：{{ student!.emergencyContact.name }}（{{ student!.emergencyContact.relation }}） · {{ student!.emergencyContact.phone }}</p></header>
    <nav class="flex shrink-0 overflow-x-auto border-b border-stone-200 px-3 sm:px-5" aria-label="学生档案页签"><button v-for="tab in tabs" :key="tab.id" class="inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium" :class="activeTab === tab.id ? 'border-teal-700 text-teal-800' : 'border-transparent text-stone-500 hover:text-stone-800'" type="button" @click="activeTab = tab.id"><component :is="tab.icon" :size="15" />{{ tab.label }}</button></nav>
    <div class="min-h-0 flex-1 overflow-y-auto p-6"><div v-if="activeTab === 'timeline'" class="mx-auto max-w-5xl space-y-6"><section class="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"><div class="flex flex-wrap items-start justify-between gap-4"><div><div class="flex items-center gap-2"><span class="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><ShieldPlus :size="18" /></span><div><h2 class="text-sm font-semibold text-slate-800">医疗就诊与会谈存证</h2><p class="mt-1 text-xs text-slate-500">仅保存在本机档案库，支持 PDF、JPG、JPEG、PNG。</p></div></div></div><div class="flex flex-wrap items-center gap-2"><input v-model="attachmentNote" class="w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-400" placeholder="附件备注（可选）" /><label class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800" :class="savingAttachments ? 'pointer-events-none opacity-60' : ''"><FileUp :size="15" />上传附件<input type="file" class="hidden" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" :disabled="savingAttachments" @change="handleMedicalFiles" /></label></div></div><p v-if="attachmentError" class="mt-3 text-xs font-medium text-rose-600">{{ attachmentError }}</p><div v-if="student!.medicalAttachments?.length" class="mt-4 grid gap-3 sm:grid-cols-2"><article v-for="attachment in student!.medicalAttachments" :key="attachment.id" class="rounded-xl border border-slate-200 bg-white p-3"><div class="flex items-start gap-3"><span class="flex size-9 shrink-0 items-center justify-center rounded-lg" :class="attachment.type === 'pdf' ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-600'"><FileText v-if="attachment.type === 'pdf'" :size="17" /><ImageIcon v-else :size="17" /></span><div class="min-w-0 flex-1"><button type="button" class="block max-w-full truncate text-left text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:underline" @click="openMedicalAttachment(attachment)">{{ attachment.name }}</button><p class="mt-1 text-[11px] text-slate-400">{{ attachment.date }} · {{ attachment.type === 'pdf' ? 'PDF 文档' : '图片' }}</p><input v-model="attachment.note" class="mt-2 w-full border-b border-slate-200 bg-transparent py-1 text-xs text-slate-600 outline-none focus:border-emerald-400" placeholder="填写附件备注" @change="updateMedicalAttachment(attachment)" /></div><div class="flex shrink-0 items-center gap-1"><button type="button" class="rounded p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700" title="预览" @click="openMedicalAttachment(attachment)"><Eye :size="15" /></button><button type="button" class="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="删除附件" @click="removeMedicalAttachment(attachment.id)"><Trash2 :size="15" /></button></div></div></article></div><p v-else class="mt-4 rounded-xl border border-dashed border-slate-200 bg-white py-6 text-center text-xs text-slate-400">暂无就诊或会谈存证，上传后会显示在这里。</p></section><StudentTimeline :student-id="student!.id" :refresh-key="workbench.studentVersion" @open-consultation="openTimelineConsultation" @open-group="detailGroup = $event" @open-work-trail="detailWorkTrail = $event" @start-lesson-consultation="startLessonConsultation" /></div>
      <div v-else-if="activeTab === 'consultations'" class="mx-auto max-w-4xl divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white"><p v-if="studentConsultations.length === 0" class="py-10 text-center text-sm text-stone-400">暂无个体咨询记录。</p><article v-for="record in studentConsultations" v-else :key="record.id" class="group"><button type="button" class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-teal-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600" :aria-expanded="expandedConsultationIds.includes(record.id)" @click="toggleConsultation(record.id)"><ChevronDown :size="16" class="shrink-0 text-stone-400 transition-transform duration-200" :class="expandedConsultationIds.includes(record.id) ? 'rotate-0' : '-rotate-90'" /><span class="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">{{ record.visitType === 'active' ? '主动来访' : record.visitType === 'referral' ? '教师转介' : '普查约访' }} <span class="ml-1 rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">第 {{ record.sessionIndex }} 次</span></span><time class="shrink-0 text-xs text-stone-400">{{ record.date }} · {{ record.durationMinutes }}分钟</time><span class="hidden shrink-0 text-xs text-teal-700 sm:inline">{{ record.problemCategories.join(' · ') || '未分类' }}</span></button><div v-if="expandedConsultationIds.includes(record.id)" class="bg-stone-50/60 px-5 pb-5 pt-1"><div class="grid gap-3 md:grid-cols-2"><section v-for="item in [{ key: 'subjective', label: 'S · 主观陈述' }, { key: 'objective', label: 'O · 客观观察' }, { key: 'assessment', label: 'A · 评估分析' }, { key: 'plan', label: 'P · 后续计划' }]" :key="item.key" class="rounded-xl border border-stone-200 bg-white p-3"><h2 class="text-xs font-semibold text-stone-700">{{ item.label }}</h2><p class="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-stone-600">{{ record.soap[item.key as keyof typeof record.soap] || '未填写' }}</p></section></div><button type="button" class="mt-3 inline-flex items-center text-xs font-semibold text-teal-700 hover:text-teal-900" @click="openConsultationDetail(record)">查看完整详情 ›</button></div></article></div>
      <div v-else-if="activeTab === 'census'" class="mx-auto max-w-3xl space-y-3"><p v-if="studentCensusList.length === 0" class="py-10 text-center text-sm text-stone-400">暂无心理普查数据。</p><article v-for="result in studentCensusList" v-else :key="result.id" class="overflow-hidden rounded-xl border border-stone-200"><button type="button" class="flex w-full items-center gap-3 p-4 text-left hover:bg-stone-50" :aria-expanded="expandedCensusIds.includes(result.id)" @click="toggleCensus(result.id)"><ChevronDown :size="16" class="shrink-0 text-stone-400 transition-transform" :class="expandedCensusIds.includes(result.id) ? '' : '-rotate-90'" /><div class="min-w-0 flex-1"><h2 class="truncate text-sm font-semibold text-stone-800">{{ result.batchTitle }}</h2><p class="mt-1 text-xs text-stone-400">{{ result.date }} · {{ result.scaleName }}</p></div><span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold" :class="result.isFlagged ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'">{{ result.isFlagged ? '触发预警' : '正常范围' }}</span></button><div v-if="expandedCensusIds.includes(result.id)" class="border-t border-stone-100 px-4 pb-4 pt-3"><div class="grid gap-2 sm:grid-cols-2"><div v-for="(score, factor) in result.scores" :key="factor" class="rounded-lg bg-stone-50 px-3 py-2"><div class="flex items-center justify-between text-xs"><span class="text-stone-600">{{ formatCensusFactor(String(factor)) }}</span><strong :class="isCensusScoreFlagged(String(factor), Number(score), result.flaggedReasons) ? 'text-rose-700' : 'text-emerald-700'">{{ score }}</strong></div><p v-if="scoreTrend(result.id, String(factor)) !== undefined" class="mt-1 text-[11px] font-medium" :class="(scoreTrend(result.id, String(factor)) ?? 0) > 0 ? 'text-rose-600' : 'text-emerald-600'">{{ (scoreTrend(result.id, String(factor)) ?? 0) > 0 ? '↗ 较上期 +' : '↘ 较上期 ' }}{{ (scoreTrend(result.id, String(factor)) ?? 0).toFixed(1) }} 分</p><div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200"><div class="h-full rounded-full" :class="isCensusScoreFlagged(String(factor), Number(score), result.flaggedReasons) ? 'bg-rose-500' : 'bg-emerald-500'" :style="{ width: `${Math.min(100, Number(score) * 10)}%` }" /></div></div></div><div class="mt-4 border-t border-stone-100 pt-3 text-sm"><p class="font-medium text-stone-700">测评结论与建议</p><p v-if="result.flaggedReasons.length" class="mt-1.5 leading-6 text-amber-700">{{ result.flaggedReasons.join('；') }}。建议结合日常观察，必要时安排个别约谈与家校沟通。</p><p v-else class="mt-1.5 leading-6 text-stone-500">本次测评未触发预警阈值，建议继续保持日常观察与支持。</p></div></div></article></div>
      <div v-else-if="activeTab === 'work-trails'" class="mx-auto max-w-3xl space-y-3"><p v-if="!workTrails.length" class="py-10 text-center text-sm text-slate-400">暂无关联工作留痕。</p><button v-for="trail in workTrails" v-else :key="trail.id" type="button" class="w-full rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-emerald-300" @click="detailWorkTrail = trail"><div class="flex justify-between gap-3"><strong class="text-sm text-slate-800">{{ trail.dateTime }} · {{ trail.title }}</strong><span class="text-xs text-emerald-700">{{ trail.attachments.length ? `📎 ${trail.attachments.length}` : '' }}</span></div><p class="mt-1 text-xs text-emerald-700">{{ trail.stakeholderName }}</p><p class="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{{ trail.content }}</p></button></div>
      <form v-else class="mx-auto max-w-2xl space-y-5" @submit.prevent="saveProfile"><div class="grid gap-4 sm:grid-cols-2"><label class="text-sm font-medium text-stone-700">姓名<input v-model="editForm.name" required class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="text-sm font-medium text-stone-700">学号<input v-model="editForm.studentNo" required class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="text-sm font-medium text-stone-700">班级<input v-model="editForm.className" required class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="text-sm font-medium text-stone-700">学籍状态<select v-model="editForm.status" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2"><option value="active">在读</option><option value="transferred">已转出</option><option value="suspended">休学</option><option value="graduated">已毕业</option></select></label><label class="text-sm font-medium text-stone-700">性别<select v-model="editForm.gender" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2"><option value="female">女</option><option value="male">男</option><option value="other">其他</option></select></label><label class="text-sm font-medium text-stone-700">宿舍号<input v-model="editForm.dormNumber" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="text-sm font-medium text-stone-700">紧急联系人<input v-model="editForm.contactName" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="text-sm font-medium text-stone-700">关系<input v-model="editForm.relation" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="text-sm font-medium text-stone-700">联系电话<input v-model="editForm.phone" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="text-sm font-medium text-stone-700">快捷标签（逗号分隔）<input v-model="editForm.tags" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label></div><section class="rounded-xl border border-amber-200 bg-amber-50/50 p-4"><label class="inline-flex items-center gap-2 text-sm font-semibold text-amber-900"><input v-model="editForm.manualGradeEnabled" type="checkbox" class="accent-teal-700" />手动指定当前年级</label><p class="mt-1 text-xs leading-5 text-amber-800">仅用于留级、降级等个案；关闭后会恢复按入学年份和当前学年自动计算。</p><label v-if="editForm.manualGradeEnabled" class="mt-3 block text-sm font-medium text-stone-700">手动年级<input v-model="editForm.manualGrade" required placeholder="如：初一" class="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2" /></label><p v-else class="mt-3 text-sm text-stone-600">当前自动年级：{{ displayedGrade }}</p></section><div class="flex flex-wrap justify-between gap-3 border-t border-stone-100 pt-5"><button type="button" class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50" @click="deleteStudent"><Trash2 :size="16" />删除本地档案</button><button class="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"><Save :size="16" />保存修改</button></div></form>
  </div><div v-if="medicalPreview" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" @click.self="medicalPreview = undefined"><div class="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><header class="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div class="min-w-0"><h2 class="truncate text-sm font-semibold text-slate-800">{{ medicalPreview.name }}</h2><p class="mt-0.5 text-xs text-slate-400">{{ medicalPreview.date }} · PDF 在线预览</p></div><button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" @click="medicalPreview = undefined"><X :size="18" /></button></header><iframe class="min-h-0 flex-1 bg-slate-100" :src="medicalPreview.url" title="PDF 预览" /></div></div><div v-if="medicalLightbox" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-6" @click.self="medicalLightbox = undefined"><button type="button" class="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" @click="medicalLightbox = undefined"><X :size="22" /></button><img :src="medicalLightbox" alt="会谈附件预览" class="max-h-[90vh] max-w-[92vw] rounded-xl object-contain shadow-2xl" /></div><ConsultationDetailDrawer v-if="detailRecord" :record="detailRecord" :student-name="student!.name" :risk-level-at-time="detailRiskLevel" @close="detailRecord = undefined" /><GroupDetailDrawer v-if="detailGroup" :activity="detailGroup" :focused-student-id="student!.id" @close="detailGroup = undefined" /><WorkTrailDetailDrawer v-if="detailWorkTrail" :trail="detailWorkTrail" @close="detailWorkTrail = undefined" /><ConsultationFormModal v-if="consultationStore.isFormOpen" :editing-id="consultationStore.editingConsultationId" @saved="loadStudent" /><StudentArchivePrintModal v-if="showArchivePrint && student" :student-id="student.id" @close="showArchivePrint = false" /></section>
</template>
