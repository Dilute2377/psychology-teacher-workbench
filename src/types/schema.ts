/**
 * 心理老师工作台 - 本地核心数据模型库 (Schema Definition)
 * 所有业务模块均以本文件为数据契约。
 */

// 1. 风险预警等级
export type RiskLevel = 'normal' | 'attention' | 'warning' | 'crisis'
export type StudentWarningLevel = 'red' | 'orange' | 'yellow' | 'none' | 'other'
export type StudentStatus = 'active' | 'transferred' | 'suspended' | 'graduated'
export type SoapField = 'subjective' | 'objective' | 'assessment' | 'plan'
export type SoapTemplates = Record<SoapField, string>
/** 新素材库五类标准类别；legacy 值仅用于兼容已经保存的旧素材。 */
export type TeachingMaterialType = 'video' | 'activity' | 'case' | 'survey' | 'reference' | 'document' | 'lesson_plan' | 'style'
export type ScheduleFrequency = 'weekly' | 'single' | 'double'
/** 兼容教学组件的旧类型名；值已统一为每周、单周、双周。 */
export type TeachingCycle = ScheduleFrequency

// 2. 学期配置
export interface TermConfig {
  id: string // 格式如 "2025-2026-1"
  academicYear: string // 如 "2025-2026"
  semester: 1 | 2
  name: string // 如 "2025-2026学年 第一学期"
  isCurrent: boolean // 是否为当前选中学期
  startDate: string // 2025-09-01
  endDate: string // 2026-01-20
  createdAt: string
}

// 3. 学生主档案（核心对象）
export interface Student {
  id: string // 唯一ID (UUID)
  studentNo: string // 学号
  name: string // 姓名
  gender: 'male' | 'female' | 'other'
  enrollmentYear: number
  /** 入学所在学段；缺失的历史档案会依据 grade 字段兼容推断。 */
  educationStage?: 'primary' | 'junior' | 'senior'
  status: StudentStatus
  grade: string // 年级 (如 "高一")
  /** 个案留级、降级等情况的人工年级；存在时优先于学年公式。 */
  gradeOverride?: string
  className: string // 班级 (如 "1班")
  dormNumber?: string // 宿舍号 (预留扩展)
  emergencyContact: { name: string; relation: string; phone: string }
  riskLevel: RiskLevel // 当前预警等级
  /** 面向迎检台账的标准预警等级；旧版 riskLevel 仍保留用于兼容。 */
  warningLevel?: StudentWarningLevel
  /** 是否纳入个案辅导学生汇总。 */
  isIndividualCase?: boolean
  /** 医疗就诊单、会谈纪要等本地附件。 */
  medicalAttachments?: MedicalAttachment[]
  tags: string[] // 快捷标签 (如 "单亲", "学业焦虑", "人际敏感")
  customFields?: Record<string, any> // 预留自定义扩展字段
  createdAt: string
  updatedAt: string
  /** 仅用于本地压测数据清理，不代表业务标签。 */
  isMock?: boolean
}

export interface MedicalAttachment {
  id: string
  name: string
  type: 'pdf' | 'image'
  url: string
  date: string
  note: string
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
  /** 预约时刻；存在时可用于本地飞书提醒。 */
  appointmentAt?: string
  durationMinutes: number // 咨询时长 (分钟)
  /** 同一学生的第几次咨询；旧记录缺失时读取端会自动回退计算。 */
  sessionIndex: number // 该学生第几次个体咨询
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
  /** 记录完成时的预警等级快照，用于历史回溯。 */
  riskLevelAtTime?: RiskLevel
  createdAt: string
  updatedAt: string
  isMock?: boolean
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
  createdAt: string
  isMock?: boolean
}

export interface CensusResult {
  id: string
  batchId: string
  studentId: string
  studentNo: string
  studentName: string
  scores: Record<string, number> // 各因子得分 (如 { depression: 2.5, anxiety: 1.8 })
  isFlagged: boolean // 是否超标预警
  flaggedReasons: string[] // 触发预警因素
  createdAt: string
  isMock?: boolean
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
  durationMinutes: number // 活动时长（分钟）
  location: string // 活动地点
  memberStudentIds: string[] // 参与学生ID列表
  processSummary: string // 过程纪要
  memberObservations: Record<string, string> // 个别成员特别表现点名 (studentId -> 观察)
  createdAt: string
  updatedAt: string
}

export type CommunicationTargetType = 'parent' | 'teacher' | 'leader' | 'other'
export type CommunicationMode = 'phone' | 'wechat' | 'in_person' | 'meeting'
export interface CommunicationAttachment {
  id: string
  name: string
  type: 'image' | 'audio' | 'video' | 'file'
  url: string
  size: string
}
export interface CommunicationLog {
  id: string
  studentId: string
  studentName: string
  termId: string
  targetType: CommunicationTargetType
  targetName: string
  communicationMode: CommunicationMode
  /** YYYY-MM-DD HH:mm */
  dateTime: string
  summary: string
  actionPlan: string
  attachments: CommunicationAttachment[]
  createdAt: string
}

export type WorkTrailCategory = 'parent' | 'teacher' | 'leader' | 'handover' | 'subbing' | 'disclaimer'

export interface WorkTrail {
  id: string
  category: WorkTrailCategory
  isStudentRelated: boolean
  studentId: string | null
  studentName: string | null
  stakeholderName: string
  dateTime: string
  /** 选填的本地飞书定点提醒时刻。 */
  remindAt?: string
  title: string
  content: string
  attachments: CommunicationAttachment[]
  createdAt: string
  isMock?: boolean
}

// 8. 上课与教学记录
export interface LessonRecord {
  id: string
  termId: string
  grade: string
  className: string
  topic: string // 课程主题 (如 "情绪管理-掌控怒气")
  date: string
  lessonPlanText: string // 简要教案/流程
  reflection: string // 课后反思
  notableStudents: Array<{ studentId: string; studentName: string; note: string }> // 课堂观察到的异常学生
  createdAt: string
  updatedAt: string
  /** 结课日志所引用的标准教案；历史手工记录可为空。 */
  lessonPlanId?: string
  weeklyScheduleId?: string
}

/** 标准教案库：只保存可复用的课程内容，不保存具体班级的上课状态。 */
export interface LessonPlan {
  id: string
  gradeTarget: string
  topicTitle: string
  description: string
  objectives: string
  procedureText: string
  attachments: string[]
  createdAt: string
  updatedAt: string
}

/** 视频、PPT、互动思路等可被教案或具体课时引用的备课素材。 */
export interface TeachingMaterial {
  id: string
  type: TeachingMaterialType
  title: string
  description: string
  resourceNote: string
  tags?: string[]
  /** 本地离线素材附件；仅保存在浏览器 IndexedDB，不会上传到任何服务器。 */
  attachment?: { name: string; type: string; dataUrl: string }
  gradeTarget?: string
  createdAt: string
  updatedAt: string
}

/** 一周中的一个授课时段，可选择关联一份标准教案。 */
export interface WeeklySchedule {
  id: string
  termId: string
  grade: string
  className: string
  /** 星期 1-5，对应周一至周五。 */
  dayOfWeek: number
  /** 课程序号，从 1 开始。 */
  period: number
  lessonPlanId?: string
  materialIds?: string[]
  /** 每周、仅单周或仅双周。 */
  frequency: ScheduleFrequency
  durationMinutes?: number
  /** 未备课固定课时、已安排待上课、已结课。旧数据缺失时按教案关联自动兼容。 */
  status?: 'unplanned' | 'scheduled' | 'completed'
  completedAt?: string
  createdAt: string
  updatedAt: string
}

/** 教师主动建立的“教案 × 年级段”教学进度单元；教案库本身不会自动生成它。 */
export interface TeachingProgressUnit {
  id: string
  termId: string
  lessonPlanId: string
  targetGrades: string[]
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

/** 班级 × 教案的授课进度；未授课单元不必落库。 */
export interface CourseProgress {
  id: string
  termId: string
  grade: string
  className: string
  lessonPlanId: string
  status: 'completed'
  lessonRecordId: string
  completedAt: string
  createdAt: string
  updatedAt: string
}

// 9. 系统全局配置与备份元数据 (预留扩展)
export interface SystemConfig {
  appPasswordHash?: string // 本地应用主锁密码 (SHA-256)
  /** 数据锁使用的本地 PIN 哈希，绝不保存明文。 */
  appLockPinHash?: string
  currentTermId: string
  themeMode: 'light' | 'dark' | 'warm'
  autoBackupIntervalDays: number // 本地备份提醒间隔
  lastBackupDate?: string
  autoBackupEnabled?: boolean
  lastAutoBackupTime?: string
  autoBackupFolderPath?: string
  /** 本机自动备份使用的随机密钥，仅保存在当前 IndexedDB。 */
  autoBackupSecret?: string
  customCategories: string[] // 自定义咨询分类列表
  /** 老师维护的 SOAP 四段录入框架。 */
  soapTemplates?: SoapTemplates
  /** 老师维护的客观观察常用词库。 */
  observationWords?: string[]
  /** 咨询问题分类的全局配置库。 */
  consultationCategories?: string[]
  feishuConfig?: {
    enabled: boolean
    webhookUrl: string
    secret: string
    notifyConsultation: boolean
    notifyTeaching: boolean
    consultationLeadMinutes?: number
    teachingLeadMinutes?: number
    dailyDigestEnabled?: boolean
    dailyDigestTime?: string
    notifyWorkTrail: boolean
  }
  schoolProfile?: {
    enabledStages: Array<'primary' | 'junior' | 'senior'>
    classCountByGrade: Record<string, number>
  }
  teachingProfile?: {
    cycleMode: 'weekly' | 'alternate'
    lessonDurationMinutes: number
    morningPeriods: number
    afternoonPeriods: number
    periods: Array<{ label: string; start: string; end: string }>
  }
}

/** 数据库存储配置的稳定主键；不改变 SystemConfig 的业务含义。 */
export interface SystemConfigRecord extends SystemConfig {
  id: 'system'
}
