/**
 * 心理老师工作台 - 本地核心数据模型库 (Schema Definition)
 * 所有业务模块均以本文件为数据契约。
 */

// 1. 风险预警等级
export type RiskLevel = 'normal' | 'attention' | 'warning' | 'crisis'
export type StudentStatus = 'active' | 'graduated'

// 2. 学期配置
export interface TermConfig {
  id: string // 格式如 "2025-2026-1"
  name: string // 如 "2025-2026学年 第一学期"
  isCurrent: boolean // 是否为当前选中学期
  startDate: string // 2025-09-01
  endDate: string // 2026-01-20
}

// 3. 学生主档案（核心对象）
export interface Student {
  id: string // 唯一ID (UUID)
  studentNo: string // 学号
  name: string // 姓名
  gender: 'male' | 'female' | 'other'
  enrollmentYear: number
  status: StudentStatus
  grade: string // 年级 (如 "高一")
  className: string // 班级 (如 "1班")
  dormNumber?: string // 宿舍号 (预留扩展)
  emergencyContact: { name: string; relation: string; phone: string }
  riskLevel: RiskLevel // 当前预警等级
  tags: string[] // 快捷标签 (如 "单亲", "学业焦虑", "人际敏感")
  customFields?: Record<string, any> // 预留自定义扩展字段
  createdAt: string
  updatedAt: string
}

// 4. 时间轴统一事件接口 (用于360全景视图)
export type TimelineEventType = 'consultation' | 'census' | 'group' | 'feedback' | 'lesson_note'

export interface TimelineEvent {
  id: string
  studentId: string
  termId: string
  type: TimelineEventType
  date: string // 事件发生时间 (ISO格式)
  title: string // 事件简明标题
  summary: string // 摘要信息
  sourceId: string // 关联具体业务表(如咨询ID/团辅ID)的句柄
  riskLevelAtTime?: RiskLevel // 发生该事件时的预警状态
}

// 5. 个体咨询记录 (SOAP标准格式)
export interface ConsultationRecord {
  id: string
  studentId: string
  termId: string
  date: string // 咨询日期
  durationMinutes: number // 咨询时长 (分钟)
  visitType: 'active' | 'referral' | 'census_followup' // 来访类型：主动/转介/普查约访
  problemCategories: string[] // 归因分类 (学业/亲子/情绪/人际 等)
  soap: {
    subjective: string // S: 主观陈述 (来访者原话/感受)
    objective: string // O: 客观观察 (情绪表现/躯体化/神态)
    assessment: string // A: 评估分析 (个案概念化/问题诊断)
    plan: string // P: 后续计划 (辅导目标/下周作业/家庭联动)
  }
  isEncrypted: boolean // 敏感记录独立加密标志
  attachmentIds?: string[] // 预留附件句柄 (如绘画测验照片)
  createdAt: string
  updatedAt: string
}

// 6. 心理普查数据批次与明细
export interface CensusBatch {
  id: string
  termId: string
  title: string // 如 "2025学年高一入校心理普查"
  date: string
  scaleName: string // 采用的量表名称 (如 SCL-90, MHT)
  totalCount: number // 普查人数
  flaggedCount: number // 预警人数
  records: CensusStudentResult[]
}

export interface CensusStudentResult {
  studentId: string
  rawScores: Record<string, number> // 各因子得分 (如 { depression: 2.5, anxiety: 1.8 })
  isFlagged: boolean // 是否超标预警
  flaggedReasons: string[] // 触发预警因素
}

// 7. 团体辅导记录
export interface GroupActivity {
  id: string
  termId: string
  title: string // 团辅名称
  theme: string // 主题 (如 "高一适应与人际凝聚力")
  sessionIndex: number // 第几次活动
  totalSessions: number // 总期数
  date: string
  memberStudentIds: string[] // 参与学生ID列表
  processSummary: string // 过程纪要
  memberObservations: Record<string, string> // 个别成员特别表现点名 (studentId -> 观察)
  createdAt: string
}

// 8. 上课与教学记录
export interface LessonRecord {
  id: string
  termId: string
  grade: string
  topic: string // 课程主题 (如 "情绪管理-掌控怒气")
  date: string
  lessonPlanText?: string // 简要教案/流程
  reflection?: string // 课后反思
  notableStudents?: Array<{ studentId: string; note: string }> // 课堂观察到的异常学生
}

// 9. 系统全局配置与备份元数据 (预留扩展)
export interface SystemConfig {
  appPasswordHash?: string // 本地应用主锁密码 (SHA-256)
  currentTermId: string
  themeMode: 'light' | 'dark' | 'warm'
  autoBackupIntervalDays: number // 本地备份提醒间隔
  lastBackupDate?: string
  customCategories: string[] // 自定义咨询分类列表
}

/** 数据库存储配置的稳定主键；不改变 SystemConfig 的业务含义。 */
export interface SystemConfigRecord extends SystemConfig {
  id: 'system'
  /** 防止老师手动清空演示数据后，在下次启动时又被自动写回。 */
  demoDataSeededAt?: string
}
