<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { ArchiveRestore, BookOpenCheck, ChartNoAxesCombined, ClipboardList, Gauge, GraduationCap, LockKeyhole, Search, Settings2, ShieldCheck, UsersRound, X } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { useWorkbenchStore } from '../stores/workbench'
import StudentList from '../components/student/StudentList.vue'
import HeaderTermSelector from '../components/layout/HeaderTermSelector.vue'
import AcademicYearPromotionModal from '../components/system/AcademicYearPromotionModal.vue'

type NavigationItem = { label: string; to: string; icon: Component }

const route = useRoute()
const workbench = useWorkbenchStore()
const activeDialog = ref<'lock' | 'backup' | null>(null)
const isPromoting = ref(false)
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
const closeDialog = () => { activeDialog.value = null }
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-stone-800">
    <header class="flex h-14 shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 shadow-sm sm:px-6">
      <div class="flex min-w-fit items-center gap-2 text-teal-800">
        <div class="flex size-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm"><ShieldCheck :size="19" /></div>
        <span class="hidden text-sm font-semibold sm:block">心理老师工作台</span>
      </div>
      <HeaderTermSelector />
      <label class="mx-auto hidden w-full max-w-xl items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-400 focus-within:border-teal-400 focus-within:bg-white md:flex">
        <Search :size="16" />
        <input v-model="workbench.globalSearch" class="w-full bg-transparent outline-none placeholder:text-stone-400" placeholder="搜索学生、记录或关键词" />
        <kbd class="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] text-stone-400">Ctrl K</kbd>
      </label>
      <div class="ml-auto flex items-center gap-1.5">
        <button class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100" type="button" @click="activeDialog = 'lock'"><LockKeyhole :size="16" /><span class="hidden lg:inline">数据锁</span></button>
        <button class="hidden rounded-lg px-2 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 xl:inline" type="button" @click="isPromoting = true">一键升学</button>
        <button class="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-2.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-800" type="button" @click="activeDialog = 'backup'"><ArchiveRestore :size="16" /><span class="hidden lg:inline">备份</span></button>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <aside class="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-stone-200 bg-white px-3 py-4">
        <p class="mb-3 px-3 text-xs font-semibold tracking-[0.18em] text-stone-400">工作空间</p>
        <nav class="space-y-1" aria-label="主导航">
          <RouterLink v-for="item in navigation" :key="item.to" :to="item.to" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-teal-50 hover:text-teal-800" active-class="bg-teal-100 text-teal-900 shadow-sm">
            <component :is="item.icon" :size="18" /><span>{{ item.label }}</span>
          </RouterLink>
        </nav>
        <div class="mt-auto rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600"><p class="font-semibold text-stone-700">心理老师工作台</p><div class="mt-2 flex flex-wrap gap-1.5"><span class="rounded-full bg-rose-50 px-2 py-1 text-rose-700">小红书 · 哈喽老师</span><span class="rounded-full bg-teal-50 px-2 py-1 text-teal-700">公众号 · 省思塔</span></div></div>
      </aside>
      <div class="flex min-w-0 flex-1 overflow-hidden">
        <section v-if="route.path === '/students'" class="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-stone-200 bg-white"><StudentList /></section>
        <section v-else class="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-stone-200 bg-white"><div class="shrink-0 border-b border-stone-100 px-5 py-5"><p class="text-xs font-medium tracking-wide text-teal-700">{{ pageLabel }}</p><h2 class="mt-1 text-lg font-semibold text-stone-800">列表与筛选区</h2></div><slot name="list"><div class="flex flex-1 items-center justify-center px-8 text-center"><p class="text-sm leading-6 text-stone-400">后续模块将在此嵌入搜索、筛选和可操作的业务列表。</p></div></slot></section>
        <main class="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white"><slot name="workspace"><RouterView /></slot></main>
      </div>
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
    <AcademicYearPromotionModal v-if="isPromoting" @close="isPromoting = false" @promoted="workbench.notifyStudentsChanged()" />
  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 160ms ease; }
.modal-enter-active section, .modal-leave-active section { transition: transform 160ms ease, opacity 160ms ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from section, .modal-leave-to section { transform: translateY(8px) scale(0.98); opacity: 0; }
</style>
