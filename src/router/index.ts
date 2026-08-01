import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import WorkspacePlaceholder from '../views/WorkspacePlaceholder.vue'

const workspaceRoutes: RouteRecordRaw[] = [
  { path: '', name: 'dashboard', component: WorkspacePlaceholder, props: { title: '概览面板', description: '在这里查看本学期的心理工作全景与待办提醒。' } },
  { path: 'students', name: 'students', component: WorkspacePlaceholder, props: { title: '学生档案', description: '选择一名学生，查看其 360° 心理档案与成长时间轴。' } },
  { path: 'consultations', name: 'consultations', component: WorkspacePlaceholder, props: { title: '个体咨询', description: 'SOAP 标准化咨询记录将在这里安全录入和追溯。' } },
  { path: 'census', name: 'census', component: WorkspacePlaceholder, props: { title: '心理普查', description: '导入普查批次、识别预警并关联学生档案。' } },
  { path: 'groups', name: 'groups', component: WorkspacePlaceholder, props: { title: '团体辅导', description: '创建团辅活动、关联成员，并记录个别观察。' } },
  { path: 'lessons', name: 'lessons', component: WorkspacePlaceholder, props: { title: '教学记录', description: '归档心理课程、课后反思与课堂观察。' } },
  { path: 'settings', name: 'settings', component: WorkspacePlaceholder, props: { title: '系统设置', description: '管理本地学期、分类、外观与备份策略。' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: MainLayout, children: workspaceRoutes },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
