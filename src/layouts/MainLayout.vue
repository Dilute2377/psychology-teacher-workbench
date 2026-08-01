<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { ArchiveRestore, BookOpenCheck, ChartNoAxesCombined, ChevronDown, ClipboardList, Gauge, GraduationCap, LockKeyhole, Search, Settings2, ShieldCheck, UsersRound, X } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { useWorkbenchStore } from '../stores/workbench'
import StudentList from '../components/student/StudentList.vue'

type NavigationItem = { label: string; to: string; icon: Component }

const route = useRoute()
const workbench = useWorkbenchStore()
const activeDialog = ref<'lock' | 'backup' | null>(null)
const navigation: NavigationItem[] = [
  { label: '概览面板', to: '/', icon: Gauge },
  { label: '学生档案', to: '/students', icon: GraduationCap },
  { label: '个体咨询', to: '/consultations', icon: ClipboardList },
  { label: '心理普查', to: '/census', icon: ChartNoAxesCombined },
  { label: '团体辅导', to: '/groups', icon: UsersRound },
  { label: '教学记录', to: '/lessons', icon: BookOpenCheck },
  { label: '系统设置', to: '/settings', icon: Settings2 },
]
const pageLabel = computed(() => navigation.find((item) => item.to === route.path)?.label ?? '工作台')
const termLabel = computed(() => workbench.currentTerm?.name ?? '请选择学期')
const closeDialog = () => { activeDialog.value = null }
</script>

<template>
  <div class="min-h-screen bg-stone-100 text-stone-800">
    <header class="flex h-16 items-center gap-3 border-b border-stone-200 bg-white px-4 shadow-sm sm:px-6">
      <div class="flex min-w-fit items-center gap-2 text-teal-800">
        <div class="flex size-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm"><ShieldCheck :size="19" /></div>
        <span class="hidden text-sm font-semibold sm:block">心理老师工作台</span>
      </div>
      <button class="ml-1 flex min-w-0 items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100" type="button">
        <span class="truncate">{{ termLabel }}</span><ChevronDown :size="15" />
      </button>
      <label class="mx-auto hidden w-full max-w-xl items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-400 focus-within:border-teal-400 focus-within:bg-white md:flex">
        <Search :size="16" />
        <input v-model="workbench.globalSearch" class="w-full bg-transparent outline-none placeholder:text-stone-400" placeholder="搜索学生、记录或关键词" />
        <kbd class="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] text-stone-400">Ctrl K</kbd>
      </label>
      <div class="ml-auto flex items-center gap-1.5">
        <button class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100" type="button" @click="activeDialog = 'lock'"><LockKeyhole :size="16" /><span class="hidden lg:inline">数据锁</span></button>
        <button class="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-2.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800" type="button" @click="activeDialog = 'backup'"><ArchiveRestore :size="16" /><span class="hidden lg:inline">备份</span></button>
      </div>
    </header>

    <div class="grid min-h-[calc(100vh-4rem)] grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[224px_minmax(270px,0.7fr)_minmax(420px,1.4fr)]">
      <aside class="border-r border-stone-200 bg-stone-50 px-2 py-4 lg:px-3">
        <p class="mb-3 hidden px-3 text-xs font-semibold tracking-[0.18em] text-stone-400 lg:block">工作空间</p>
        <nav class="space-y-1" aria-label="主导航">
          <RouterLink v-for="item in navigation" :key="item.to" :to="item.to" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-teal-50 hover:text-teal-800" active-class="bg-teal-100 text-teal-900 shadow-sm">
            <component :is="item.icon" :size="18" /><span class="hidden lg:inline">{{ item.label }}</span>
          </RouterLink>
        </nav>
      </aside>
      <section class="hidden min-w-0 flex-col border-r border-stone-200 bg-white lg:flex">
        <div class="border-b border-stone-100 px-5 py-5"><p class="text-xs font-medium tracking-wide text-teal-700">{{ pageLabel }}</p><h2 class="mt-1 text-lg font-semibold text-stone-800">列表与筛选区</h2></div>
        <StudentList v-if="route.path === '/students'" />
        <slot v-else name="list"><div class="flex flex-1 items-center justify-center px-8 text-center"><p class="text-sm leading-6 text-stone-400">后续模块将在此嵌入搜索、筛选和可操作的业务列表。</p></div></slot>
      </section>
      <main class="min-w-0 bg-stone-100 p-3 sm:p-5"><div class="h-full min-h-[calc(100vh-6.5rem)] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"><slot name="workspace"><RouterView /></slot></div></main>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="activeDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 p-4" @click.self="closeDialog">
          <section class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" :aria-label="activeDialog === 'lock' ? '数据锁' : '本地备份'">
            <div class="flex items-start justify-between gap-4"><div><p class="text-sm font-semibold text-stone-800">{{ activeDialog === 'lock' ? '数据锁' : '本地备份' }}</p><p class="mt-2 text-sm leading-6 text-stone-500">{{ activeDialog === 'lock' ? '应用锁与密钥管理将在安全模块完成后启用。' : '加密 .mindbag 备份将在数据安全模块完成后提供。' }}</p></div><button class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700" type="button" aria-label="关闭" @click="closeDialog"><X :size="18" /></button></div>
            <button class="mt-5 w-full rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800" type="button" @click="closeDialog">知道了</button>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 160ms ease; }
.modal-enter-active section, .modal-leave-active section { transition: transform 160ms ease, opacity 160ms ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from section, .modal-leave-to section { transform: translateY(8px) scale(0.98); opacity: 0; }
</style>
