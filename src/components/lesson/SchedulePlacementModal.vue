<script setup lang="ts">
import { computed, ref } from 'vue'
import { Trash2, X } from '@lucide/vue'
import { useTeachingStore } from '../../stores/useTeachingStore'
import type { LessonPlan, ScheduleFrequency, WeeklySchedule } from '../../types/schema'
import { focusModalField } from '../../utils/focusModalField'

const props = defineProps<{ plan?: LessonPlan | null; existingSchedule?: WeeklySchedule | null; dayOfWeek: number; period: number; frequency: ScheduleFrequency; classes: Array<{ grade: string; className: string }> }>()
const emit = defineEmits<{ close: []; saved: [] }>(); const teachingStore = useTeachingStore(); const selected = ref(props.existingSchedule ? `${props.existingSchedule.grade}|${props.existingSchedule.className}` : ''); const planId = ref(props.plan?.id ?? props.existingSchedule?.lessonPlanId ?? ''); const fixedOnly = ref(!props.plan && !props.existingSchedule?.lessonPlanId); const saving = ref(false)
const selectedClass = computed(() => props.classes.find((item) => `${item.grade}|${item.className}` === selected.value))
void focusModalField()
async function save() {
  if (!selectedClass.value || (!planId.value && !fixedOnly.value)) { window.alert('请选择授课班级，并选择教案或勾选固定班级。'); return }
  saving.value = true
  try {
    if (fixedOnly.value) await teachingStore.createFixedScheduleAtSlot(selectedClass.value.grade, selectedClass.value.className, props.dayOfWeek, props.period, props.frequency)
    else await teachingStore.schedulePlanAtSlot(planId.value, selectedClass.value.grade, selectedClass.value.className, props.dayOfWeek, props.period, props.frequency)
    emit('saved'); emit('close')
  } catch (error) {
    window.alert(error instanceof Error ? `保存课时失败：${error.message}` : '保存课时失败，请稍后重试。')
  } finally { saving.value = false }
}
async function clear() {
  if (!props.existingSchedule || !window.confirm('确定清除整条排课吗？该时段会恢复为完全空闲。')) return
  saving.value = true
  try { await teachingStore.deleteWeeklySchedule(props.existingSchedule.id); emit('saved'); emit('close') }
  catch (error) { window.alert(error instanceof Error ? `清除课时失败：${error.message}` : '清除课时失败，请稍后重试。') }
  finally { saving.value = false }
}
</script>

<template><Teleport to="body"><div class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 p-4" @click.self="emit('close')"><section class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><header class="flex items-start justify-between"><div><p class="text-xs font-medium text-teal-700">周{{ teachingStore.weekdayLabel[dayOfWeek - 1] }} · 第 {{ period }} 节</p><h2 class="mt-1 text-lg font-semibold text-stone-800">{{ existingSchedule ? '调整课时' : '新增课时' }}</h2></div><button class="rounded-lg p-1 text-stone-400 hover:bg-stone-100" @click="emit('close')"><X :size="18" /></button></header><label class="mt-5 block text-sm font-medium text-stone-700">选择授课班级<select v-model="selected" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2"><option value="">请选择班级</option><option v-for="item in classes" :key="`${item.grade}|${item.className}`" :value="`${item.grade}|${item.className}`">{{ item.grade }}{{ item.className }}</option></select></label><label class="mt-4 block text-sm font-medium text-stone-700">选择教案<select v-model="planId" :disabled="fixedOnly" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 disabled:bg-stone-50"><option value="">请选择教案</option><option v-for="item in teachingStore.lessonPlans" :key="item.id" :value="item.id">{{ item.topicTitle }}</option></select></label><label class="mt-3 inline-flex items-center gap-2 text-xs text-stone-600"><input v-model="fixedOnly" type="checkbox" class="accent-teal-700" />仅登记固定班级，暂不关联教案</label><footer class="mt-6 flex flex-wrap justify-between gap-2"><button v-if="existingSchedule" type="button" :disabled="saving" class="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50" @click="clear"><Trash2 :size="15" />清除整条排课</button><span v-else></span><div class="flex gap-2"><button class="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100" @click="emit('close')">取消</button><button :disabled="!selected || (!planId && !fixedOnly) || saving" class="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="save">{{ saving ? '保存中…' : existingSchedule ? '确认调整' : '确认新增' }}</button></div></footer></section></div></Teleport></template>
