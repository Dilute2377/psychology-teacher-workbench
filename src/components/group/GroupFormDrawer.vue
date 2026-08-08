<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { X } from '@lucide/vue'
import { db } from '../../db'
import { studentService } from '../../services/studentService'
import { useGroupStore } from '../../stores/useGroupStore'
import { useTermStore } from '../../stores/useTermStore'
import { getStudentGrade } from '../../utils/academic'
import { useSchoolConfigStore } from '../../stores/useSchoolConfigStore'
import { sortClassNames } from '../../constants/grades'
import type { GroupActivity, Student } from '../../types/schema'
import { focusModalField } from '../../utils/focusModalField'

const props = defineProps<{ editingId: string | null }>()
const emit = defineEmits<{ saved: [] }>()
const groupStore = useGroupStore()
const termStore = useTermStore()
const schoolConfig = useSchoolConfigStore()
const students = ref<Student[]>([])
const keyword = ref('')
const grade = ref('')
const className = ref('')
const selectedIds = ref<string[]>([])
const observations = ref<Record<string, string>>({})
const observationOpenId = ref<string | null>(null)
const errorMessage = ref('')
const saving = ref(false)
const form = reactive({ title: '', theme: '', sessionIndex: 1, totalSessions: 1, date: new Date().toISOString().slice(0, 10), durationMinutes: 60, location: '团辅室', processSummary: '' })
const gradeOptions = computed(() => schoolConfig.enabledGrades)
const classOptions = computed(() => grade.value ? schoolConfig.classesForGrade(grade.value) : sortClassNames([...new Set(schoolConfig.enabledGrades.flatMap((item) => schoolConfig.classesForGrade(item)))]) )
const matchingStudents = computed(() => students.value.filter((student) => student.status === 'active').filter((student) => (!grade.value || getStudentGrade(student, termStore.currentTerm) === grade.value) && (!className.value || student.className === className.value) && (!keyword.value.trim() || [student.name, student.studentNo, student.className].join(' ').includes(keyword.value.trim()))))
const candidateStudents = computed(() => matchingStudents.value.filter((student) => !selectedIds.value.includes(student.id)))
const selectedStudents = computed(() => selectedIds.value.map((id) => students.value.find((student) => student.id === id)).filter((student): student is Student => Boolean(student)))

function reset(activity?: GroupActivity) {
  Object.assign(form, activity ? { title: activity.title, theme: activity.theme, sessionIndex: activity.sessionIndex, totalSessions: activity.totalSessions, date: activity.date, durationMinutes: activity.durationMinutes, location: activity.location, processSummary: activity.processSummary } : { title: '', theme: '', sessionIndex: 1, totalSessions: 1, date: new Date().toISOString().slice(0, 10), durationMinutes: 60, location: '团辅室', processSummary: '' })
  selectedIds.value = activity ? [...activity.memberStudentIds] : []
  observations.value = activity ? { ...activity.memberObservations } : {}
  observationOpenId.value = selectedIds.value[0] ?? null
  errorMessage.value = ''
}
function addMember(student: Student) {
  if (selectedIds.value.includes(student.id)) return
  selectedIds.value = [...selectedIds.value, student.id]
  observations.value[student.id] ??= ''
  observationOpenId.value ??= student.id
}
function removeMember(id: string) {
  selectedIds.value = selectedIds.value.filter((memberId) => memberId !== id)
  delete observations.value[id]
  if (observationOpenId.value === id) observationOpenId.value = selectedIds.value[0] ?? null
}
function addMatchingStudents() {
  candidateStudents.value.forEach(addMember)
}
async function save() {
  if (!termStore.currentTermId) { errorMessage.value = '当前学期尚未就绪，请稍后重试。'; return }
  if (!form.title.trim() || !form.theme.trim() || !form.date || !selectedIds.value.length) { errorMessage.value = '请完成活动名称、主题、日期并至少选择一名成员。'; return }
  saving.value = true; errorMessage.value = ''
  const draft = { termId: termStore.currentTermId, title: form.title.trim(), theme: form.theme.trim(), sessionIndex: Math.max(1, Number(form.sessionIndex) || 1), totalSessions: Math.max(1, Number(form.totalSessions) || 1), date: form.date, durationMinutes: Math.max(1, Number(form.durationMinutes) || 60), location: form.location.trim() || '未填写', memberStudentIds: [...selectedIds.value], processSummary: form.processSummary.trim(), memberObservations: Object.fromEntries(selectedIds.value.map((id) => [id, observations.value[id]?.trim() ?? ''])) }
  try { if (props.editingId) await groupStore.updateGroupActivity(props.editingId, draft); else await groupStore.addGroupActivity(draft); emit('saved'); groupStore.closeForm() } catch { errorMessage.value = '保存团辅记录失败，请稍后重试。' } finally { saving.value = false }
}
onMounted(async () => { await schoolConfig.load(); students.value = await studentService.list(); reset(props.editingId ? await db.groupActivities.get(props.editingId) : undefined); await focusModalField() })
</script>

<template>
  <Teleport to="body"><div class="fixed inset-0 z-50 bg-stone-950/30" @click.self="groupStore.closeForm()"><section class="ml-auto flex h-full w-full max-w-3xl flex-col overflow-y-auto bg-white p-6 shadow-2xl"><header class="flex items-start justify-between gap-4"><h2 class="text-lg font-semibold text-stone-800">{{ editingId ? '编辑团体辅导' : '新增团体辅导' }}</h2><button type="button" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" @click="groupStore.closeForm()"><X :size="18" /></button></header><p v-if="errorMessage" class="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ errorMessage }}</p>
    <div class="mt-5 grid gap-4 sm:grid-cols-2"><label class="text-sm font-medium text-stone-700">活动名称<input v-model="form.title" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" placeholder="如：考前情绪调节小组" /></label><label class="text-sm font-medium text-stone-700">主题<input v-model="form.theme" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" placeholder="如：学业压力与情绪调节" /></label><label class="text-sm font-medium text-stone-700">活动日期<input v-model="form.date" type="date" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="text-sm font-medium text-stone-700">活动时长（分钟）<input v-model.number="form.durationMinutes" min="1" type="number" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="text-sm font-medium text-stone-700">第几期<input v-model.number="form.sessionIndex" min="1" type="number" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="text-sm font-medium text-stone-700">共几期<input v-model.number="form.totalSessions" min="1" type="number" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label><label class="text-sm font-medium text-stone-700">地点<input v-model="form.location" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" /></label></div>
    <section class="mt-6 rounded-xl border border-stone-200"><header class="border-b border-stone-100 p-4"><div class="flex flex-wrap items-center gap-2"><p class="mr-auto text-sm font-semibold text-stone-800">参与成员 <span class="text-teal-700">{{ selectedIds.length }}</span></p><input v-model="keyword" class="w-32 rounded-lg border border-stone-200 px-2 py-1.5 text-xs" placeholder="搜姓名/学号" /><select v-model="grade" class="rounded-lg border border-stone-200 px-2 py-1.5 text-xs"><option value="">全部年级</option><option v-for="item in gradeOptions" :key="item">{{ item }}</option></select><select v-model="className" class="rounded-lg border border-stone-200 px-2 py-1.5 text-xs"><option value="">全部班级</option><option v-for="item in classOptions" :key="item">{{ item }}</option></select><button type="button" :disabled="!candidateStudents.length" class="rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-40" @click="addMatchingStudents">+ 添加筛选结果</button></div><p class="mt-2 text-xs text-stone-400">先筛选并加入右侧成员区；适用于大规模学生库。</p></header><div class="grid min-h-56 divide-y divide-stone-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0"><div class="min-w-0"><p class="border-b border-stone-100 px-4 py-2 text-xs font-semibold text-stone-500">候选学生（{{ candidateStudents.length }}）</p><div class="max-h-56 overflow-y-auto"><button v-for="student in candidateStudents" :key="student.id" type="button" class="flex w-full items-center justify-between gap-3 border-b border-stone-50 px-4 py-2.5 text-left text-sm hover:bg-teal-50" @click="addMember(student)"><span><span class="font-medium text-stone-700">{{ student.name }}</span><span class="ml-2 text-xs text-stone-400">{{ getStudentGrade(student, termStore.currentTerm) }}{{ student.className }}</span></span><span class="text-xs font-semibold text-teal-700">+ 加入</span></button><p v-if="!candidateStudents.length" class="px-4 py-8 text-center text-xs text-stone-400">没有可加入的学生</p></div></div><div class="min-w-0"><p class="border-b border-stone-100 px-4 py-2 text-xs font-semibold text-stone-500">已选成员（{{ selectedStudents.length }}）</p><div class="max-h-56 overflow-y-auto p-3"><div v-if="selectedStudents.length" class="flex flex-wrap gap-2"><span v-for="student in selectedStudents" :key="student.id" class="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1.5 text-xs text-teal-800">{{ student.name }}<button type="button" class="rounded-full text-teal-500 hover:text-rose-600" :aria-label="`移除 ${student.name}`" @click="removeMember(student.id)"><X :size="13" /></button></span></div><p v-else class="py-8 text-center text-xs text-stone-400">从左侧加入成员</p></div></div></div></section>
    <label class="mt-6 block text-sm font-medium text-stone-700">过程纪要<textarea v-model="form.processSummary" rows="5" class="mt-1.5 w-full rounded-lg border border-stone-200 p-3 text-sm leading-6" placeholder="记录活动流程、成员互动与总体评估。" /></label>
    <section v-if="selectedStudents.length" class="mt-6"><h3 class="text-sm font-semibold text-stone-800">成员个别观察</h3><p class="mt-1 text-xs text-stone-400">逐位展开填写即可；没有特殊表现可留空。</p><div class="mt-3 overflow-hidden rounded-xl border border-stone-200"><button v-for="student in selectedStudents" :key="student.id" type="button" class="flex w-full items-center justify-between border-b border-stone-100 px-4 py-3 text-left text-sm hover:bg-stone-50" :class="observationOpenId === student.id ? 'bg-teal-50/60 text-teal-800' : 'text-stone-700'" @click="observationOpenId = observationOpenId === student.id ? null : student.id"><span><span class="font-medium">{{ student.name }}</span><span class="ml-2 text-xs text-stone-400">{{ getStudentGrade(student, termStore.currentTerm) }}{{ student.className }}</span></span><span class="text-xs">{{ observationOpenId === student.id ? '收起 −' : '填写观察 +' }}</span></button><div v-for="student in selectedStudents" v-show="observationOpenId === student.id" :key="`${student.id}-observation`" class="border-b border-stone-100 bg-stone-50 p-3"><textarea v-model="observations[student.id]" rows="3" class="w-full rounded-lg border border-stone-200 bg-white p-2 text-sm leading-6" placeholder="该成员的特别表现、支持资源或后续关注点" /></div></div></section>
    <footer class="mt-6 flex justify-end gap-2 border-t border-stone-100 pt-5"><button type="button" class="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100" @click="groupStore.closeForm()">取消</button><button type="button" :disabled="saving" class="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="save">{{ saving ? '保存中…' : '保存团辅' }}</button></footer>
  </section></div></Teleport>
</template>
