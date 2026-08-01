<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X } from '@lucide/vue'
import { useTeachingStore } from '../../stores/useTeachingStore'

const props = defineProps<{ initialPlanId?: string; grades: string[] }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const teachingStore = useTeachingStore()
const planId = ref(props.initialPlanId ?? '')
const selectedGrades = ref<string[]>([])
const saving = ref(false)
const selectedPlan = computed(() => teachingStore.planById.get(planId.value))
watch(() => props.initialPlanId, (value) => { planId.value = value ?? '' })
function toggleGrade(grade: string) { selectedGrades.value = selectedGrades.value.includes(grade) ? selectedGrades.value.filter((item) => item !== grade) : [...selectedGrades.value, grade] }
async function save() { if (!planId.value || !selectedGrades.value.length) return; saving.value = true; try { await teachingStore.createProgressUnit(planId.value, selectedGrades.value); emit('saved'); emit('close') } finally { saving.value = false } }
</script>

<template><Teleport to="body"><div class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/35 p-4" @click.self="emit('close')"><section class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><header class="flex items-start justify-between gap-4"><div><p class="text-xs font-medium text-teal-700">课程进度大盘</p><h2 class="mt-1 text-lg font-semibold text-stone-800">新增进度单元</h2><p class="mt-1 text-sm leading-6 text-stone-500">一个进度单元只在老师明确选择年级后才会出现在大盘中。</p></div><button type="button" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" @click="emit('close')"><X :size="18" /></button></header><label class="mt-5 block text-sm font-medium text-stone-700">选择教案<select v-model="planId" class="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2"><option value="">请选择教案</option><option v-for="plan in teachingStore.lessonPlans" :key="plan.id" :value="plan.id">{{ plan.topicTitle }}</option></select></label><div class="mt-5"><p class="text-sm font-medium text-stone-700">授课年级段</p><div class="mt-2 grid gap-2 sm:grid-cols-3"><label v-for="grade in grades" :key="grade" class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm" :class="selectedGrades.includes(grade) ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-stone-200 text-stone-600'"><input type="checkbox" :checked="selectedGrades.includes(grade)" class="accent-teal-700" @change="toggleGrade(grade)" />{{ grade }}</label></div><p v-if="!grades.length" class="mt-3 text-sm text-amber-700">请先在系统设置中选择学校学段并配置班级。</p></div><p v-if="selectedPlan" class="mt-5 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">将创建“{{ selectedPlan.topicTitle }}”的进度行，不会自动替其他教案创建任何行。</p><footer class="mt-6 flex justify-end gap-2"><button type="button" class="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100" @click="emit('close')">取消</button><button type="button" :disabled="!planId || !selectedGrades.length || saving" class="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="save">{{ saving ? '创建中…' : '确认加入大盘' }}</button></footer></section></div></Teleport></template>
