<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { CalendarPlus, Trash2, X } from '@lucide/vue'
import { useTermStore, type TermUsage } from '../../stores/useTermStore'

const emit = defineEmits<{ close: [] }>()
const termStore = useTermStore()
const message = ref('')
const usages = ref<Record<string, TermUsage>>({})
const nextProposal = computed(() => {
  const newest = termStore.allTerms[0]
  if (!newest) return { academicYear: '2025-2026', semester: 1 as const, startDate: '2025-09-01', endDate: '2026-01-20' }
  const [start, end] = newest.academicYear.split('-').map(Number)
  const nextSemester = newest.semester === 1 ? 2 : 1
  const nextStart = newest.semester === 1 ? start : end
  const nextEnd = newest.semester === 1 ? end : end + 1
  return nextSemester === 2
    ? { academicYear: `${start}-${end}`, semester: 2 as const, startDate: `${end}-02-16`, endDate: `${end}-07-10` }
    : { academicYear: `${nextStart}-${nextEnd}`, semester: 1 as const, startDate: `${nextStart}-09-01`, endDate: `${nextEnd}-01-20` }
})
const form = reactive({ academicYear: '', semester: 1 as 1 | 2, startDate: '', endDate: '', isCurrent: false })
function resetForm() { Object.assign(form, nextProposal.value, { isCurrent: false }) }
async function refresh() { await termStore.fetchTerms(); usages.value = Object.fromEntries(await Promise.all(termStore.allTerms.map(async (term) => [term.id, await termStore.getTermUsage(term.id)]))) }
async function addTerm() {
  message.value = ''
  try { await termStore.addTerm({ ...form }); await refresh(); resetForm(); message.value = '新学期已保存到本地数据库。' } catch (error) { message.value = error instanceof Error ? error.message : '保存学期失败，请检查填写内容。' }
}
async function removeTerm(id: string) {
  message.value = ''
  const usage = await termStore.getTermUsage(id)
  if (usage.total > 0) { message.value = '该学期存在业务数据，无法直接删除。'; return }
  if (termStore.currentTermId === id) { message.value = '当前学期不能删除，请先切换到其他学期。'; return }
  if (!window.confirm('确认永久删除这个没有关联记录的学期吗？')) return
  await termStore.deleteTerm(id)
  await refresh()
}
onMounted(async () => { await refresh(); resetForm() })
</script>

<template>
  <Teleport to="body"><div class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 p-4" @click.self="emit('close')">
    <section class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-label="管理与新增学期">
      <div class="flex items-start justify-between gap-4"><div><h2 class="text-lg font-semibold text-stone-800">管理与新增学期</h2><p class="mt-1 text-sm text-stone-500">全部设置仅保存在本机 IndexedDB，可安全切换并驱动页面联动。</p><p class="mt-2 text-xs leading-5 text-amber-700">💡 提示：学期是系统的历史时间轴。学生升级或毕业后，历史学期无需删除，系统会自动保留历史档案与服务履历。</p></div><button class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" type="button" @click="emit('close')"><X :size="18" /></button></div>
      <p v-if="message" class="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{{ message }}</p>
      <div class="mt-5 overflow-x-auto rounded-xl border border-stone-200"><table class="min-w-full text-left text-sm"><thead class="bg-stone-50 text-xs text-stone-500"><tr><th class="px-4 py-3">学期</th><th class="px-4 py-3">时间范围</th><th class="px-4 py-3">状态</th><th class="px-4 py-3">关联记录</th><th class="px-4 py-3 text-right">操作</th></tr></thead><tbody><tr v-for="term in termStore.allTerms" :key="term.id" class="border-t border-stone-100"><td class="whitespace-nowrap px-4 py-3 font-medium text-stone-800">{{ term.name }}</td><td class="whitespace-nowrap px-4 py-3 text-stone-500">{{ term.startDate }} 至 {{ term.endDate }}</td><td class="px-4 py-3"><span v-if="term.isCurrent" class="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">当前学期</span><button v-else class="text-xs text-teal-700 hover:underline" @click="termStore.setCurrentTerm(term.id).then(refresh)">设为当前</button></td><td class="px-4 py-3 text-stone-500">{{ usages[term.id]?.total ?? 0 }} 条</td><td class="px-4 py-3 text-right"><span class="group relative inline-flex"><button class="inline-flex items-center gap-1 text-xs hover:underline disabled:cursor-not-allowed disabled:text-stone-300 disabled:no-underline" :class="(usages[term.id]?.total ?? 0) > 0 ? 'text-stone-300' : 'text-rose-600'" :disabled="(usages[term.id]?.total ?? 0) > 0" type="button" @click="removeTerm(term.id)"><Trash2 :size="14" />删除</button><span v-if="(usages[term.id]?.total ?? 0) > 0" role="tooltip" class="pointer-events-none absolute bottom-full right-0 z-10 mb-2 hidden w-60 rounded-lg bg-stone-800 px-3 py-2 text-left text-xs leading-5 text-white shadow-lg group-hover:block">该学期已产生业务数据，为保护历史档案安全，无法删除。</span></span></td></tr></tbody></table></div>
      <form class="mt-5 rounded-xl border border-teal-100 bg-teal-50/40 p-4" @submit.prevent="addTerm"><div class="flex items-center gap-2 text-sm font-semibold text-teal-900"><CalendarPlus :size="17" />新增学期</div><div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label class="text-xs text-stone-600">学年（如 2026-2027）<input v-model="form.academicYear" required pattern="\\d{4}-\\d{4}" class="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" /></label><label class="text-xs text-stone-600">学期<select v-model.number="form.semester" class="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><option :value="1">第一学期</option><option :value="2">第二学期</option></select></label><label class="text-xs text-stone-600">开始日期<input v-model="form.startDate" required type="date" class="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" /></label><label class="text-xs text-stone-600">结束日期<input v-model="form.endDate" required type="date" class="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" /></label></div><label class="mt-3 inline-flex items-center gap-2 text-sm text-stone-600"><input v-model="form.isCurrent" type="checkbox" class="accent-teal-700" />设置为当前学期</label><div class="mt-4 flex justify-end"><button class="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">保存新学期</button></div></form>
    </section>
  </div></Teleport>
</template>
