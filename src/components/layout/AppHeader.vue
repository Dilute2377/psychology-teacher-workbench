<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { ArchiveRestore, LockKeyhole, Search, ShieldCheck } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import HeaderTermSelector from './HeaderTermSelector.vue'
import { useAppLockStore } from '../../stores/useAppLockStore'
import { useSearchStore } from '../../stores/useSearchStore'

const emit = defineEmits<{ backup: []; promote: [] }>()
const route = useRoute()
const router = useRouter()
const appLock = useAppLockStore()
const search = useSearchStore()
const listPaths = new Set(['/students', '/students/key-students', '/consultations', '/work-trails'])
onMounted(() => { void appLock.load() })

watch(() => route.query.search, (value) => {
  if (typeof value === 'string' && value !== search.searchKeyword) search.setSearchKeyword(value)
}, { immediate: true })

function handleSearchKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || listPaths.has(route.path) || !search.searchKeyword.trim()) return
  void router.push({ path: '/students', query: { search: search.searchKeyword.trim() } })
}
</script>

<template>
  <header class="flex h-14 shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 shadow-sm sm:px-6">
    <div class="flex min-w-fit items-center gap-2 text-teal-800"><div class="flex size-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm"><ShieldCheck :size="19" /></div><span class="hidden text-sm font-semibold sm:block">心理老师工作台</span></div>
    <HeaderTermSelector />
    <label class="mx-auto hidden w-full max-w-xl items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-400 focus-within:border-teal-400 focus-within:bg-white md:flex"><Search :size="16" /><input v-model="search.searchKeyword" class="w-full bg-transparent outline-none placeholder:text-stone-400" placeholder="搜索学生、记录或关键词" @keydown="handleSearchKeydown" /><kbd class="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] text-stone-400">Ctrl K</kbd></label>
    <div class="ml-auto flex items-center gap-1.5"><button class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100" type="button" @click="appLock.lock()"><LockKeyhole :size="16" /><span class="hidden lg:inline">数据锁</span></button><button class="hidden rounded-lg px-2 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 xl:inline" type="button" @click="emit('promote')">一键升学</button><button class="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-2.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800" type="button" @click="emit('backup')"><ArchiveRestore :size="16" /><span class="hidden lg:inline">备份</span></button></div>
  </header>
</template>
