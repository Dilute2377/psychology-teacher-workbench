import { db } from '../db'
import type { ConsultationRecord, MedicalAttachment, Student, StudentWarningLevel, TimelineEvent, WorkTrail } from '../types/schema'
import { crisisBadgeFromKey, levelKeyForStoredValue, readCrisisConfig } from '../stores/useCrisisConfigStore'

export type DossierData = {
  student: Student
  consultations: ConsultationRecord[]
  workTrails: WorkTrail[]
  timeline: TimelineEvent[]
  schoolName: string
  generatedAt: string
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character] ?? character))
}

export function getStudentWarningLevel(student: Student): StudentWarningLevel {
  if (student.warningLevel) return student.warningLevel
  if (student.riskLevel === 'crisis') return 'red'
  if (student.riskLevel === 'warning') return 'orange'
  if (student.riskLevel === 'attention') return 'yellow'
  return student.isIndividualCase ? 'other' : 'none'
}

export function getStudentWarningLabel(value: StudentWarningLevel | string | null | undefined) {
  if (value === 'other') return '🟣 其他个案'
  const config = readCrisisConfig()
  const badge = crisisBadgeFromKey(levelKeyForStoredValue(value, config), config)
  return badge.key === 'normal' ? `${badge.emoji} ${badge.label} / 普通个案` : `${badge.emoji} ${badge.label}`
}

export function formatDossierDate(value: string | undefined) {
  if (!value) return '—'
  return value.replace('T', ' ').replace(/\.\d{3}Z$/, '').replace(/Z$/, '')
}

function displaySchoolName(config: unknown) {
  const record = config as { schoolName?: string; schoolProfile?: { schoolName?: string } } | undefined
  return record?.schoolName?.trim() || record?.schoolProfile?.schoolName?.trim() || '本校心理健康指导中心'
}

export async function loadStudentDossierData(studentId: string): Promise<DossierData | undefined> {
  const student = await db.students.get(studentId)
  if (!student) return undefined
  const [consultations, workTrails, timeline, settings] = await Promise.all([
    db.consultations.where('studentId').equals(studentId).toArray(),
    db.workTrails.where('studentId').equals(studentId).toArray(),
    db.timelineEvents.where('studentId').equals(studentId).toArray(),
    db.settings.get('system'),
  ])
  return {
    student,
    consultations: consultations.sort((left, right) => right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt)),
    workTrails: workTrails.sort((left, right) => right.dateTime.localeCompare(left.dateTime) || right.createdAt.localeCompare(left.createdAt)),
    timeline: timeline.sort((left, right) => right.date.localeCompare(left.date)),
    schoolName: displaySchoolName(settings),
    generatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
}

function renderAttachment(attachment: MedicalAttachment) {
  return `<li class="record-row"><div><strong>${escapeHtml(attachment.name)}</strong><span class="muted">${attachment.type === 'pdf' ? 'PDF' : '图片'} · ${escapeHtml(attachment.date)}</span></div><p>${escapeHtml(attachment.note || '未填写备注')}</p></li>`
}

function renderConsultation(record: ConsultationRecord) {
  const soap = record.soap ?? { subjective: '', objective: '', assessment: '', plan: '' }
  const riskText = record.riskLevelAtTime ? getStudentWarningLabel(record.riskLevelAtTime) : '未记录'
  return `<article class="consultation print-no-break"><div class="record-heading"><strong>第 ${escapeHtml(record.sessionIndex || 1)} 次个体咨询</strong><span>${escapeHtml(record.date)} · ${escapeHtml(record.durationMinutes || 40)} 分钟 · ${record.visitType === 'active' ? '主动来访' : record.visitType === 'referral' ? '教师转介' : '普查约访'}</span></div><p class="muted">困扰类型：${escapeHtml(record.problemCategories?.join('、') || '未分类')} · 当次评级：${escapeHtml(riskText)}</p><div class="soap-grid"><div><b>S · 主观陈述</b><p>${escapeHtml(soap.subjective || '未填写')}</p></div><div><b>O · 客观观察</b><p>${escapeHtml(soap.objective || '未填写')}</p></div><div><b>A · 评估分析</b><p>${escapeHtml(soap.assessment || '未填写')}</p></div><div><b>P · 后续计划</b><p>${escapeHtml(soap.plan || '未填写')}</p></div></div></article>`
}

function renderWorkTrail(record: WorkTrail) {
  const category = { parent: '家长沟通', teacher: '班主任协同', leader: '领导指令', handover: '任务交接', subbing: '代课与杂务', disclaimer: '危机免责存证' }[record.category] || record.category
  return `<li class="record-row print-no-break"><div><strong>${escapeHtml(record.title)}</strong><span class="muted">${escapeHtml(formatDossierDate(record.dateTime))} · ${escapeHtml(category)} · ${escapeHtml(record.stakeholderName)}</span></div><p>${escapeHtml(record.content)}</p></li>`
}

export function buildDossierTimeline(data: DossierData) {
  const events = [...data.timeline]
  const seen = new Set(events.map((event) => `${event.type}-${event.sourceId}`))
  data.consultations.forEach((record) => { if (!seen.has(`consultation-${record.id}`)) events.push({ id: `derived-consultation-${record.id}`, studentId: data.student.id, termId: record.termId, type: 'consultation', date: record.date, title: `第 ${record.sessionIndex || 1} 次个体咨询`, summary: record.problemCategories?.join('、') || '个体咨询', sourceId: record.id }) })
  data.workTrails.forEach((record) => { if (!seen.has(`feedback-${record.id}`)) events.push({ id: `derived-trail-${record.id}`, studentId: data.student.id, termId: '', type: 'feedback', date: record.dateTime, title: record.title, summary: record.content, sourceId: record.id }) })
  return events.sort((left, right) => right.date.localeCompare(left.date)).map((event) => `<li class="timeline-row"><time>${escapeHtml(formatDossierDate(event.date))}</time><div><strong>${escapeHtml(event.title)}</strong><p>${escapeHtml(event.summary)}</p></div></li>`).join('') || '<li class="muted">暂无服务履历。</li>'
}

export async function buildStudentDossierHtml(studentId: string) {
  const data = await loadStudentDossierData(studentId)
  if (!data) throw new Error('未找到该学生档案。')
  const student = data.student
  const attachments = student.medicalAttachments ?? []
  const currentWarning = getStudentWarningLabel(getStudentWarningLevel(student))
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(student.name)} - 学生心理健康完整卷宗</title><style>
    @page{size:A4 portrait;margin:13mm 15mm}*{box-sizing:border-box}body{margin:0;color:#1e293b;background:#fff;font-family:"Microsoft YaHei","PingFang SC",sans-serif;font-size:11px;line-height:1.65}h1,h2,h3,p{margin:0}#dossier{max-width:794px;margin:0 auto}.cover{min-height:230px;display:flex;flex-direction:column;justify-content:center;border-bottom:2px solid #0f766e}.eyebrow{font-size:11px;letter-spacing:.2em;color:#0f766e;font-weight:700}.cover h1{margin-top:12px;font-size:25px;line-height:1.35;color:#0f172a}.cover-meta{display:flex;justify-content:space-between;gap:16px;margin-top:28px;color:#475569}.badge{display:inline-block;border:1px solid #86efac;border-radius:999px;padding:2px 9px;color:#047857;background:#f0fdf4;font-size:10px;font-weight:700}.section{margin-top:20px}.section h2{padding-bottom:6px;border-bottom:1px solid #cbd5e1;color:#0f766e;font-size:15px}.info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border:1px solid #e2e8f0;margin-top:10px}.info-item{padding:7px 10px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}.info-item:nth-child(2n){border-right:0}.info-item:nth-last-child(-n+2){border-bottom:0}.label{display:block;color:#64748b;font-size:10px}.value{font-weight:600;color:#1e293b}.record-list{padding:0;margin:10px 0;list-style:none}.record-row{border-bottom:1px solid #e2e8f0;padding:8px 0}.record-row:last-child{border-bottom:0}.record-row div,.record-heading{display:flex;justify-content:space-between;gap:12px}.record-row strong,.record-heading strong{color:#0f172a}.record-row p{margin-top:3px;white-space:pre-wrap;color:#475569}.muted{color:#64748b;font-size:10px;font-weight:400}.consultation{border:1px solid #e2e8f0;border-radius:8px;margin-top:10px;padding:10px}.consultation+.consultation{margin-top:8px}.soap-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:8px}.soap-grid>div{border:1px solid #e2e8f0;border-radius:6px;padding:7px}.soap-grid b{color:#0f766e;font-size:10px}.soap-grid p{margin-top:3px;white-space:pre-wrap;color:#475569}.timeline{list-style:none;margin:10px 0;padding:0}.timeline-row{display:grid;grid-template-columns:135px 1fr;gap:12px;border-left:2px solid #99f6e4;padding:5px 0 5px 12px}.timeline-row time{color:#64748b;font-size:10px}.timeline-row p{color:#475569;white-space:pre-wrap}.footer{display:flex;justify-content:space-between;margin-top:26px;padding-top:8px;border-top:1px solid #cbd5e1;color:#64748b;font-size:10px}.print-no-break{break-inside:avoid}
    @media print{body{background:#fff}#dossier{max-width:none}.cover{min-height:210px}.section{break-inside:auto}.print-no-break{break-inside:avoid;page-break-inside:avoid}.no-print{display:none!important}}
  </style></head><body><main id="dossier"><section class="cover"><p class="eyebrow">${escapeHtml(data.schoolName)}</p><h1>《学生心理健康辅导与危机干预完整卷宗》</h1><div class="cover-meta"><span>学生：${escapeHtml(student.name)} · 学号：${escapeHtml(student.studentNo)}</span><span class="badge">内部资料 · 保密</span></div></section>
  <section class="section print-no-break"><h2>模块 1 · 基本信息</h2><div class="info-grid"><div class="info-item"><span class="label">姓名</span><span class="value">${escapeHtml(student.name)}</span></div><div class="info-item"><span class="label">学号</span><span class="value">${escapeHtml(student.studentNo)}</span></div><div class="info-item"><span class="label">班级</span><span class="value">${escapeHtml(student.grade)} ${escapeHtml(student.className)}</span></div><div class="info-item"><span class="label">预警 / 个案等级</span><span class="value">${escapeHtml(currentWarning)}</span></div><div class="info-item"><span class="label">监护人 / 紧急联系人</span><span class="value">${escapeHtml(student.emergencyContact?.name || '—')} · ${escapeHtml(student.emergencyContact?.phone || '—')}</span></div><div class="info-item"><span class="label">困扰类型</span><span class="value">${escapeHtml(student.tags?.join('、') || '以咨询记录为准')}</span></div></div></section>
  <section class="section"><h2>模块 2 · 医疗与会谈存证清单</h2><ul class="record-list">${attachments.map(renderAttachment).join('') || '<li class="muted">暂无就诊或会谈附件。</li>'}</ul></section>
  <section class="section"><h2>模块 3 · 历次个体咨询 SOAP 记录</h2>${data.consultations.map(renderConsultation).join('') || '<p class="muted" style="margin-top:10px">暂无个体咨询记录。</p>'}</section>
  <section class="section"><h2>模块 4 · 工作留痕与家校 / 领导协同记录</h2><ul class="record-list">${data.workTrails.map(renderWorkTrail).join('') || '<li class="muted">暂无工作留痕。</li>'}</ul></section>
  <section class="section"><h2>模块 5 · 服务履历 Timeline</h2><ol class="timeline">${buildDossierTimeline(data)}</ol></section>
  <footer class="footer"><span>报告生成时间：${escapeHtml(data.generatedAt)} · ${escapeHtml(data.schoolName)}</span><span>内部资料 · 请妥善保管</span></footer></main></body></html>`
}
