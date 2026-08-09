<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Save, ShieldAlert } from '@lucide/vue'
import { crisisBadgeFromKey, useCrisisConfigStore, type CrisisLevelLabels, type SeverityDirection } from '../../stores/useCrisisConfigStore'

const props = defineProps<{ onboarding?: boolean }>()
const emit = defineEmits<{ saved: [] }>()
const crisisConfig = useCrisisConfigStore()
const direction = ref<SeverityDirection>('desc')
const labels = reactive<CrisisLevelLabels>({ level_1_label: '重大', level_2_label: '严重', level_3_label: '一般', normal_label: '正常' })
const message = ref('')

const preview = computed(() => {
  const snapshot = { severityDirection: direction.value, levelLabels: { ...labels } }
  return (['level_1', 'level_2', 'level_3', 'normal'] as const).map((key) => crisisBadgeFromKey(key, snapshot))
})

function syncFromStore() {
  direction.value = crisisConfig.severityDirection
  Object.assign(labels, crisisConfig.levelLabels)
}

function save() {
  const nextLabels = Object.fromEntries(Object.entries(labels).map(([key, value]) => [key, value.trim() || '未命名'])) as Partial<CrisisLevelLabels>
  crisisConfig.save({ severityDirection: direction.value, levelLabels: nextLabels })
  syncFromStore()
  message.value = '危机评级体系已保存，并已即时应用到全系统。'
  emit('saved')
}

onMounted(() => { crisisConfig.load(); syncFromStore() })
</script>

<template>
  <article class="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
    <div class="flex items-start gap-3"><span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><ShieldAlert :size="18" /></span><div><h2 class="font-semibold text-stone-800">心理危机评级体系</h2><p class="mt-1 text-xs leading-5 text-stone-500">仅调整显示解释与颜色排序，不修改已有学生档案和历史记录。</p></div></div>
    <fieldset class="mt-4 grid gap-2 md:grid-cols-2"><legend class="sr-only">危机等级方向</legend><label class="flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm" :class="direction === 'desc' ? 'border-rose-300 bg-rose-50/60 text-rose-900' : 'border-stone-200 text-stone-600'"><input v-model="direction" type="radio" value="desc" class="mt-0.5 accent-rose-600" /><span><strong>模式 A：一级为最高危</strong><span class="mt-1 block text-xs text-stone-500">红 1 / 橙 2 / 黄 3</span></span></label><label class="flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm" :class="direction === 'asc' ? 'border-rose-300 bg-rose-50/60 text-rose-900' : 'border-stone-200 text-stone-600'"><input v-model="direction" type="radio" value="asc" class="mt-0.5 accent-rose-600" /><span><strong>模式 B：三级为最高危</strong><span class="mt-1 block text-xs text-stone-500">红 3 / 橙 2 / 黄 1</span></span></label></fieldset>
    <div class="mt-4 grid gap-3 sm:grid-cols-4"><label class="text-xs font-medium text-stone-600">一级别名<input v-model="labels.level_1_label" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" placeholder="重大" /></label><label class="text-xs font-medium text-stone-600">二级别名<input v-model="labels.level_2_label" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" placeholder="严重" /></label><label class="text-xs font-medium text-stone-600">三级别名<input v-model="labels.level_3_label" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" placeholder="一般" /></label><label class="text-xs font-medium text-stone-600">正常文案<input v-model="labels.normal_label" class="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" placeholder="正常" /></label></div>
    <div class="mt-4 flex flex-wrap items-center gap-2"><span class="text-xs text-stone-400">当前全局显示：</span><span v-for="item in preview" :key="item.key" class="rounded-full px-2.5 py-1 text-xs font-medium" :style="{ backgroundColor: `${item.color}18`, color: item.color }">{{ item.emoji }} {{ item.label }}</span></div>
    <p v-if="message" class="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{{ message }}</p>
    <button type="button" class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700" @click="save"><Save :size="15" />{{ props.onboarding ? '保存评级并继续' : '保存并即时应用' }}</button>
  </article>
</template>
