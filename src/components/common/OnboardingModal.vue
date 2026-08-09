<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ChevronLeft, ChevronRight, GraduationCap, X } from '@lucide/vue'
import { db } from '../../db'
import CrisisConfigPanel from '../system/CrisisConfigPanel.vue'
import { STAGE_GRADES, STAGE_LABELS, type SchoolStage } from '../../constants/grades'
import { useSchoolConfigStore } from '../../stores/useSchoolConfigStore'

const schoolConfig = useSchoolConfigStore()
const visible = ref(false)
const step = ref<1 | 2>(1)
const stage = ref<SchoolStage>('junior')
const classCountByGrade = reactive<Record<string, number>>({})
const saving = ref(false)

const grades = computed(() => [...STAGE_GRADES[stage.value]])

function syncCounts() {
  for (const grade of grades.value) classCountByGrade[grade] = schoolConfig.schoolProfile.classCountByGrade[grade] ?? 10
}

function changeStage(next: SchoolStage) {
  stage.value = next
  syncCounts()
}

async function continueToCrisis() {
  saving.value = true
  try {
    await schoolConfig.updateSchoolProfile({ enabledStages: [stage.value], classCountByGrade: { ...classCountByGrade } })
    step.value = 2
  } finally { saving.value = false }
}

function finish() {
  localStorage.setItem('hasCompletedOnboarding', 'true')
  visible.value = false
}

onMounted(async () => {
  const existing = await db.settings.get('system')
  if (existing?.schoolProfile || localStorage.getItem('hasCompletedOnboarding') === 'true') return
  await schoolConfig.load()
  stage.value = schoolConfig.schoolProfile.enabledStages[0] ?? 'junior'
  syncCounts()
  visible.value = true
})
</script>

<template>
  <Teleport to="body"><div v-if="visible" class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/65 p-4"><section class="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"><header class="flex items-start justify-between bg-teal-800 px-6 py-5 text-white"><div class="flex items-center gap-3"><span class="flex size-10 items-center justify-center rounded-xl bg-white/15"><GraduationCap :size="21" /></span><div><h1 class="font-semibold">首次使用配置引导</h1><p class="mt-1 text-xs text-teal-100">先配置学校范围，再选择本地区心理危机评级口径。</p></div></div><button type="button" class="rounded-lg p-1 text-teal-100 hover:bg-white/10" @click="visible = false"><X :size="18" /></button></header><div class="flex items-center gap-2 border-b border-stone-100 px-6 py-3 text-xs font-semibold text-stone-400"><span :class="step === 1 ? 'text-teal-700' : 'text-stone-400'">1 学校与班级</span><ChevronRight :size="14" /><span :class="step === 2 ? 'text-teal-700' : 'text-stone-400'">2 危机评级体系</span></div><div v-if="step === 1" class="p-6"><h2 class="text-lg font-semibold text-stone-800">学校类型与班级数</h2><p class="mt-1 text-sm text-stone-500">这些配置会用于学生档案、课表和教学进度单元。</p><fieldset class="mt-5 flex flex-wrap gap-2"><legend class="sr-only">学校类型</legend><label v-for="(label, key) in STAGE_LABELS" :key="key" class="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm" :class="stage === key ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-stone-200 text-stone-600'"><input :checked="stage === key" type="radio" name="onboarding-stage" class="accent-teal-700" @change="changeStage(key as SchoolStage)" />{{ label }}</label></fieldset><div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><label v-for="grade in grades" :key="grade" class="text-sm font-medium text-stone-700">{{ grade }}班级数<input v-model.number="classCountByGrade[grade]" type="number" min="1" max="99" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" /></label></div><div class="mt-6 flex justify-end"><button type="button" :disabled="saving" class="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" @click="continueToCrisis">下一步<ChevronRight :size="16" /></button></div></div><div v-else class="p-6"><CrisisConfigPanel onboarding @saved="finish" /><button type="button" class="mt-3 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-stone-500 hover:bg-stone-100" @click="step = 1"><ChevronLeft :size="15" />返回修改学校配置</button></div></section></div></Teleport>
</template>
