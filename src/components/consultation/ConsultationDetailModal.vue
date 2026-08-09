<script setup lang="ts">
import { X } from '@lucide/vue'
import type { ConsultationRecord, RiskLevel } from '../../types/schema'
import { useCrisisConfigStore } from '../../stores/useCrisisConfigStore'

defineProps<{ record: ConsultationRecord; studentName?: string; riskLevelAtTime?: RiskLevel }>()
const emit = defineEmits<{ close: [] }>()
const crisisConfig = useCrisisConfigStore()
const visitLabels: Record<ConsultationRecord['visitType'], string> = { active: '主动来访', referral: '教师转介', census_followup: '普查约访' }
</script>

<template>
  <Teleport to="body"><div class="fixed inset-0 z-50 bg-stone-950/30" @click.self="emit('close')"><article class="ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"><header class="shrink-0 border-b border-stone-100 p-6"><div class="flex items-start justify-between gap-4"><div><p class="text-xs font-medium text-teal-700">{{ visitLabels[record.visitType] }}</p><h2 class="mt-1 text-lg font-semibold text-stone-800">{{ studentName ? `${studentName}的第 ${record.sessionIndex} 次个体咨询详情` : `第 ${record.sessionIndex} 次个体咨询详情` }}</h2><p class="mt-1 text-sm text-stone-500">{{ record.date }} · {{ record.durationMinutes }} 分钟</p></div><button type="button" aria-label="关闭详情" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" @click="emit('close')"><X :size="18" /></button></div><div class="mt-4 flex flex-wrap gap-2"><span class="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">第 {{ record.sessionIndex }} 次</span><span v-for="category in record.problemCategories" :key="category" class="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">{{ category }}</span><span v-if="riskLevelAtTime ?? record.riskLevelAtTime" class="rounded-full px-2.5 py-1 text-xs font-medium" :style="{ backgroundColor: `${crisisConfig.getStudentWarningBadge(riskLevelAtTime ?? record.riskLevelAtTime).color}18`, color: crisisConfig.getStudentWarningBadge(riskLevelAtTime ?? record.riskLevelAtTime).color }">当时评级：{{ crisisConfig.getStudentWarningBadge(riskLevelAtTime ?? record.riskLevelAtTime).emoji }} {{ crisisConfig.getStudentWarningBadge(riskLevelAtTime ?? record.riskLevelAtTime).label }}</span></div></header><div class="min-h-0 flex-1 overflow-y-auto p-6"><div class="space-y-3"><section v-for="item in [{ key: 'subjective', label: 'S · 主观陈述' }, { key: 'objective', label: 'O · 客观观察' }, { key: 'assessment', label: 'A · 评估分析' }, { key: 'plan', label: 'P · 后续计划' }]" :key="item.key" class="rounded-xl border border-stone-200 p-4"><h3 class="text-sm font-semibold text-stone-800">{{ item.label }}</h3><p class="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-600">{{ record.soap[item.key as keyof typeof record.soap] || '未填写' }}</p></section></div></div></article></div></Teleport>
</template>
