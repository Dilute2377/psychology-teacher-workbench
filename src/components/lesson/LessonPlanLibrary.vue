<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { GripVertical, Plus, Search, Trash2 } from '@lucide/vue'
import { useTeachingStore } from '../../stores/useTeachingStore'
import LessonPlanDrawer from './LessonPlanDrawer.vue'

const teachingStore = useTeachingStore(); const keyword = ref(''); const drawerOpen = ref(false); const editingId = ref<string | null>(null)
const plans = computed(() => teachingStore.lessonPlans.filter((plan) => !keyword.value.trim() || [plan.topicTitle, plan.description, plan.objectives, plan.procedureText].join(' ').includes(keyword.value.trim())))
function add() { editingId.value = null; drawerOpen.value = true }
function edit(id: string) { editingId.value = id; drawerOpen.value = true }
async function remove(id: string, title: string) { if (!window.confirm(`确定删除教案“${title}”吗？`)) return; await teachingStore.deleteLessonPlan(id) }
function beginDrag(event: DragEvent, id: string) { event.dataTransfer?.setData('text/plain', id); event.dataTransfer?.setData('application/x-lesson-plan', id); event.dataTransfer && (event.dataTransfer.effectAllowed = 'copy') }
onMounted(() => void teachingStore.fetchTeachingData())
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-white"><header class="space-y-3 border-b border-stone-100 p-4"><div class="flex items-center justify-between gap-2"><p class="text-sm font-semibold text-stone-800">心理教案库</p><button class="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800" @click="add"><Plus :size="14" />新教案</button></div><label class="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2 text-sm text-stone-400"><Search :size="15" /><input v-model="keyword" class="w-full bg-transparent outline-none" placeholder="搜索教案主题或内容" /></label></header><div class="min-h-0 flex-1 overflow-y-auto p-3"><p v-if="!plans.length" class="p-5 text-center text-sm text-stone-400">还没有符合条件的教案。</p><article v-for="plan in plans" v-else :key="plan.id" draggable="true" class="mb-2 rounded-xl border border-stone-200 bg-white p-3 transition hover:border-teal-300 hover:bg-teal-50" @dragstart="beginDrag($event, plan.id)"><div class="flex items-start gap-1"><GripVertical :size="15" class="mt-0.5 shrink-0 text-stone-300" /><div class="min-w-0 flex-1"><p class="text-[11px] font-medium text-teal-700">📝 全校通用教案</p><h3 class="mt-1 line-clamp-2 text-sm font-semibold text-stone-800">{{ plan.topicTitle }}</h3><p class="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{{ plan.description || plan.objectives || '尚未填写课程简介。' }}</p></div></div><div class="mt-3 flex justify-end gap-2"><button type="button" class="rounded-lg border border-stone-200 px-2 py-1.5 text-xs text-stone-500 hover:bg-stone-50" @click.stop="edit(plan.id)">编辑</button><button type="button" class="rounded-lg border border-stone-200 px-2 py-1.5 text-rose-500 hover:bg-rose-50" :aria-label="`删除 ${plan.topicTitle}`" @click.stop="remove(plan.id, plan.topicTitle)"><Trash2 :size="14" /></button></div></article></div><LessonPlanDrawer v-if="drawerOpen" :editing-id="editingId" @close="drawerOpen = false" @saved="teachingStore.fetchTeachingData()" /></div>
</template>
