<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { Plus, Search, UsersRound } from '@lucide/vue'
import { useGroupStore } from '../../stores/useGroupStore'
import { useTermStore } from '../../stores/useTermStore'

const groupStore = useGroupStore()
const termStore = useTermStore()
const keyword = ref('')
async function load() { await groupStore.fetchGroupActivities(keyword.value) }
watch(keyword, () => void load())
watch(() => termStore.currentTermId, () => void load())
onMounted(load)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col"><header class="shrink-0 space-y-3 border-b border-stone-100 p-4"><div class="flex items-center justify-between"><span class="text-sm font-semibold text-stone-800">团体辅导</span><button type="button" class="inline-flex items-center gap-1 rounded-lg bg-teal-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800" @click="groupStore.openForm()"><Plus :size="15" />新增团辅</button></div><label class="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-2 text-sm text-stone-400"><Search :size="15" /><input v-model="keyword" class="w-full bg-transparent outline-none" placeholder="搜活动名称或主题" /></label></header><div class="min-h-0 flex-1 overflow-y-auto p-3"><p v-if="groupStore.groupActivities.length === 0" class="p-5 text-center text-sm text-stone-400">当前学期暂无团辅记录。</p><button v-for="activity in groupStore.groupActivities" v-else :key="activity.id" type="button" class="mb-2 w-full rounded-xl border p-3 text-left transition hover:border-teal-300 hover:bg-teal-50" :class="groupStore.selectedGroupId === activity.id ? 'border-teal-400 bg-teal-50 shadow-sm' : 'border-stone-200 bg-white'" @click="groupStore.selectedGroupId = activity.id"><div class="flex items-start justify-between gap-2"><div><p class="text-sm font-semibold text-stone-800">{{ activity.title }}</p><span class="mt-1 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-[11px] text-teal-700">{{ activity.theme }}</span></div><time class="text-xs text-stone-400">{{ activity.date }}</time></div><div class="mt-3 flex items-center justify-between text-xs text-stone-500"><span>第 {{ activity.sessionIndex }}/{{ activity.totalSessions }} 期</span><span class="inline-flex items-center gap-1"><UsersRound :size="13" />{{ activity.memberStudentIds.length }} 人</span></div></button></div>
  </div>
</template>
