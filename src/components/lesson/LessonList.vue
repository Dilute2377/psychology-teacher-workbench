<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, Search } from '@lucide/vue'
import { useLessonStore } from '../../stores/useLessonStore'
import { useTermStore } from '../../stores/useTermStore'
import { useWorkbenchStore } from '../../stores/workbench'

const lessonStore = useLessonStore(); const termStore = useTermStore(); const workbench = useWorkbenchStore()
const keyword = ref(''); const grade = ref(''); const className = ref('')
const grades = computed(() => [...new Set(lessonStore.lessonRecords.map((record) => record.grade).filter(Boolean))].sort())
const classes = computed(() => [...new Set(lessonStore.lessonRecords.filter((record) => !grade.value || record.grade === grade.value).map((record) => record.className).filter(Boolean))].sort())
const records = computed(() => lessonStore.lessonRecords.filter((record) => (!grade.value || record.grade === grade.value) && (!className.value || record.className === className.value) && (!keyword.value.trim() || record.topic.includes(keyword.value.trim()))))
async function load() { await lessonStore.fetchLessonRecords() }
watch([() => termStore.currentTermId, () => workbench.studentVersion], () => void load())
watch(grade, () => { if (className.value && !classes.value.includes(className.value)) className.value = '' })
onMounted(load)
</script>

<template><div class="flex h-full min-h-0 flex-col"><header class="shrink-0 space-y-3 border-b border-stone-100 p-4"><div class="flex items-center justify-between gap-2"><span class="text-sm font-semibold text-stone-800">教学记录</span><button type="button" class="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800" @click="lessonStore.openForm()"><Plus :size="15" />新增记录</button></div><label class="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2 text-sm text-stone-400"><Search :size="15" /><input v-model="keyword" class="w-full bg-transparent outline-none" placeholder="搜索课程主题" /></label><div class="grid grid-cols-2 gap-2"><select v-model="grade" class="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"><option value="">全部年级</option><option v-for="item in grades" :key="item">{{ item }}</option></select><select v-model="className" class="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"><option value="">全部班级</option><option v-for="item in classes" :key="item">{{ item }}</option></select></div></header><div class="min-h-0 flex-1 overflow-y-auto p-3"><p v-if="!records.length" class="p-5 text-center text-sm text-stone-400">当前学期暂无符合条件的课程记录。</p><button v-for="record in records" v-else :key="record.id" type="button" class="mb-2 w-full rounded-xl border p-3 text-left transition hover:border-teal-300 hover:bg-teal-50" :class="lessonStore.selectedLessonId === record.id ? 'border-teal-400 bg-teal-50 shadow-sm' : 'border-stone-200 bg-white'" @click="lessonStore.selectedLessonId = record.id"><div class="flex items-start justify-between gap-2"><p class="text-sm font-semibold text-stone-800">{{ record.topic }}</p><time class="shrink-0 text-xs text-stone-400">{{ record.date }}</time></div><p class="mt-1 text-xs text-stone-500">{{ record.grade }}{{ record.className }}</p><p class="mt-2 text-xs text-teal-700">课堂观察 {{ record.notableStudents.length }} 人</p></button></div></div></template>
