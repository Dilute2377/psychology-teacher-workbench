import { createRouter, createWebHashHistory, createWebHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import DashboardView from '../views/DashboardView.vue'
import StudentDetailView from '../views/student/StudentDetailView.vue'
import KeyStudentsMasterView from '../views/student/KeyStudentsMasterView.vue'
import ConsultationView from '../views/consultation/ConsultationView.vue'
import CensusView from '../views/census/CensusView.vue'
import GroupView from '../views/group/GroupView.vue'
import WorkTrailView from '../views/work-trail/WorkTrailView.vue'
import LessonView from '../views/lesson/LessonView.vue'
import SettingsView from '../views/settings/SettingsView.vue'

const workspaceRoutes: RouteRecordRaw[] = [
  { path: '', name: 'dashboard', component: DashboardView },
  { path: 'students', name: 'students', component: StudentDetailView },
  { path: 'students/key-students', name: 'key-students', component: KeyStudentsMasterView },
  { path: 'consultations', name: 'consultations', component: ConsultationView },
  { path: 'census', name: 'census', component: CensusView },
  { path: 'groups', name: 'groups', component: GroupView },
  { path: 'work-trails', name: 'work-trails', component: WorkTrailView },
  { path: 'communications', redirect: '/work-trails' },
  { path: 'lessons', name: 'lessons', component: LessonView },
  { path: 'settings', name: 'settings', component: SettingsView },
]

const router = createRouter({
  history: window.location.protocol === 'file:' ? createWebHashHistory() : createWebHistory(),
  routes: [
    { path: '/', component: MainLayout, children: workspaceRoutes },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
