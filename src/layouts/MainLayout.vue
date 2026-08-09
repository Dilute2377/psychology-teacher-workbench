<script setup lang="ts">
import { ref, type Component } from 'vue'
import { BookOpenCheck, ChartNoAxesCombined, ClipboardList, Gauge, GraduationCap, Settings2, ShieldPlus, UsersRound } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { useWorkbenchStore } from '../stores/workbench'
import StudentList from '../components/student/StudentList.vue'
import ConsultationList from '../components/consultation/ConsultationList.vue'
import CensusBatchList from '../components/census/CensusBatchList.vue'
import GroupList from '../components/group/GroupList.vue'
import WorkTrailList from '../components/work-trail/WorkTrailList.vue'
import LessonPlanLibrary from '../components/lesson/LessonPlanLibrary.vue'
import AppHeader from '../components/layout/AppHeader.vue'
import AcademicYearPromotionModal from '../components/system/AcademicYearPromotionModal.vue'
import AppLockModal from '../components/system/AppLockModal.vue'
import BackupRestoreModal from '../components/system/BackupRestoreModal.vue'
import { useAppLockStore } from '../stores/useAppLockStore'

type NavigationItem = { label: string; to: string; icon: Component }

const route = useRoute()
const workbench = useWorkbenchStore()
const appLock = useAppLockStore()
const activeDialog = ref<'backup' | null>(null)
const isPromoting = ref(false)
const navigation: NavigationItem[] = [
  { label: '概览面板', to: '/', icon: Gauge },
  { label: '学生档案', to: '/students', icon: GraduationCap },
  { label: '个体咨询', to: '/consultations', icon: ClipboardList },
  { label: '心理普查', to: '/census', icon: ChartNoAxesCombined },
  { label: '团体辅导', to: '/groups', icon: UsersRound },
  { label: '工作留痕与协同', to: '/work-trails', icon: ShieldPlus },
  { label: '教学记录', to: '/lessons', icon: BookOpenCheck },
  { label: '系统设置', to: '/settings', icon: Settings2 },
]
const closeDialog = () => { activeDialog.value = null }
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-stone-800">
    <AppHeader @backup="activeDialog = 'backup'" @promote="isPromoting = true" />

    <div class="flex flex-1 overflow-hidden">
      <aside class="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-stone-200 bg-white px-3 py-4">
        <p class="mb-3 px-3 text-xs font-semibold tracking-[0.18em] text-stone-400">工作空间</p>
        <nav class="space-y-1" aria-label="主导航">
          <RouterLink v-for="item in navigation" :key="item.to" :to="item.to" class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-teal-50 hover:text-teal-800" :class="route.path === item.to ? 'bg-teal-100 text-teal-900 shadow-sm' : ''">
            <component :is="item.icon" :size="18" /><span>{{ item.label }}</span>
          </RouterLink>
        </nav>
        <div class="mt-auto rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600"><p class="font-semibold text-stone-700">心理老师工作台</p><div class="mt-2 flex flex-wrap gap-1.5"><span class="rounded-full bg-rose-50 px-2 py-1 text-rose-700">小红书 · 哈喽老师</span><span class="rounded-full bg-teal-50 px-2 py-1 text-teal-700">公众号 · 省思塔</span></div></div>
      </aside>
      <div class="flex min-w-0 flex-1 overflow-hidden">
        <template v-if="route.path !== '/settings'">
        <section v-if="route.path === '/students' || route.path === '/students/key-students'" class="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-stone-200 bg-white"><StudentList /></section>
        <section v-else-if="route.path === '/consultations'" class="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-stone-200 bg-white"><ConsultationList /></section>
        <section v-else-if="route.path === '/census'" class="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-stone-200 bg-white"><CensusBatchList /></section>
        <section v-else-if="route.path === '/groups'" class="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-stone-200 bg-white"><GroupList /></section>
        <section v-else-if="route.path === '/work-trails'" class="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-stone-200 bg-white"><WorkTrailList /></section>
        <section v-else-if="route.path === '/lessons'" class="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-stone-200 bg-white"><LessonPlanLibrary /></section>
        <section v-else class="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-stone-200 bg-white"><div class="shrink-0 border-b border-stone-100 px-5 py-5"><p class="text-xs font-medium tracking-wide text-teal-700">工作台</p><h2 class="mt-1 text-lg font-semibold text-stone-800">列表与筛选区</h2></div><slot name="list"><div class="flex flex-1 items-center justify-center px-8 text-center"><p class="text-sm leading-6 text-stone-400">后续模块将在此嵌入搜索、筛选和可操作的业务列表。</p></div></slot></section>
        </template>
        <main class="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-white"><slot name="workspace"><RouterView v-slot="{ Component }"><component :is="Component" /></RouterView></slot></main>
      </div>
    </div>

    <BackupRestoreModal v-if="activeDialog === 'backup'" @close="closeDialog" @restored="workbench.notifyStudentsChanged()" />
    <AppLockModal v-if="appLock.isLocked" />
    <AcademicYearPromotionModal v-if="isPromoting" @close="isPromoting = false" @promoted="workbench.notifyStudentsChanged()" />
  </div>
</template>
