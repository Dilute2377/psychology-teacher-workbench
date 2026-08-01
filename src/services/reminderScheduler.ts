import type { Pinia } from 'pinia'
import { db } from '../db'
import { useSettingsStore } from '../stores/useSettingsStore'
import { feishuCards, sendFeishuCard } from './feishuService'

const notifiedIds = new Set<string>()
const localDateTime = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
const parseLocalDateTime = (value: string) => new Date(value.includes('T') ? value : value.replace(' ', 'T'))
const clampLeadMinutes = (value: number | undefined, fallback: number) => Math.min(120, Math.max(1, Number(value) || fallback))
const isDueSoon = (target: Date, now: Date, leadMinutes: number) => {
  const delta = target.getTime() - now.getTime()
  const leadMs = leadMinutes * 60_000
  return delta <= leadMs && delta > leadMs - 35_000
}
const activeFrequency = (frequency: 'weekly' | 'single' | 'double', date: Date) => frequency === 'weekly' || (frequency === 'single' ? Math.ceil((((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(date.getFullYear(), 0, 1).getDay() + 1) / 7) % 2 === 1 : Math.ceil((((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(date.getFullYear(), 0, 1).getDay() + 1) / 7) % 2 === 0)

export function startReminderScheduler(pinia: Pinia) {
  let stopped = false
  async function tick() {
    if (stopped) return
    const settings = useSettingsStore(pinia)
    if (!settings.loaded) await settings.load()
    const config = settings.feishuConfig
    if (!config.enabled || !config.webhookUrl) return
    const now = new Date()
    const [students, consultations, schedules, plans, schoolConfig, trails] = await Promise.all([db.students.toArray(), db.consultations.toArray(), db.weeklySchedules.toArray(), db.lessonPlans.toArray(), db.settings.get('system'), db.workTrails.toArray()])
    const studentById = new Map(students.map((student) => [student.id, student]))
    const planById = new Map(plans.map((plan) => [plan.id, plan]))
    if (config.notifyConsultation) for (const consultation of consultations) {
      if (!consultation.appointmentAt) continue
      const target = parseLocalDateTime(consultation.appointmentAt); const id = `consultation:${consultation.id}:${consultation.appointmentAt}`
      if (!notifiedIds.has(id) && isDueSoon(target, now, clampLeadMinutes(config.consultationLeadMinutes, 15))) { const student = studentById.get(consultation.studentId); await sendFeishuCard(config, feishuCards.consultation(`${student?.name ?? '未关联学生'} (${student?.grade ?? ''}${student?.className ?? ''})`, localDateTime(target))); notifiedIds.add(id) }
    }
    if (config.notifyTeaching) {
      const weekday = now.getDay() || 7; const periods = schoolConfig?.teachingProfile?.periods ?? []
      for (const schedule of schedules.filter((item) => item.dayOfWeek === weekday && item.status !== 'completed' && activeFrequency(item.frequency, now))) {
        const period = periods[schedule.period - 1]; if (!period?.start) continue
        const [hour, minute] = period.start.split(':').map(Number); const target = new Date(now); target.setHours(hour, minute, 0, 0); const id = `teaching:${schedule.id}:${localDateTime(target)}`
        if (!notifiedIds.has(id) && isDueSoon(target, now, clampLeadMinutes(config.teachingLeadMinutes, 10))) { await sendFeishuCard(config, feishuCards.teaching(`${schedule.grade}${schedule.className}`, `第 ${schedule.period} 节 (${period.start})`, planById.get(schedule.lessonPlanId ?? '')?.topicTitle ?? '未关联教案')); notifiedIds.add(id) }
      }
    }
    if (config.dailyDigestEnabled && config.dailyDigestTime === localDateTime(now).slice(11)) {
      const digestId = `digest:${localDateTime(now).slice(0, 10)}`
      if (!notifiedIds.has(digestId)) {
        const weekday = now.getDay() || 7; const periods = schoolConfig?.teachingProfile?.periods ?? []
        const teachingLines = schedules.filter((item) => item.dayOfWeek === weekday && item.status !== 'completed' && activeFrequency(item.frequency, now)).map((item) => {
          const period = periods[item.period - 1]
          return `${period?.start ?? `第 ${item.period} 节`} · ${item.grade}${item.className} · ${planById.get(item.lessonPlanId ?? '')?.topicTitle ?? '未关联教案'}`
        })
        const today = localDateTime(now).slice(0, 10)
        const consultationLines = consultations.filter((item) => item.appointmentAt?.replace('T', ' ').startsWith(today)).sort((a, b) => String(a.appointmentAt).localeCompare(String(b.appointmentAt))).map((item) => `${String(item.appointmentAt).replace('T', ' ').slice(11)} · ${studentById.get(item.studentId)?.name ?? '未关联学生'}`)
        await sendFeishuCard(config, feishuCards.dailyDigest(today, teachingLines, consultationLines)); notifiedIds.add(digestId)
      }
    }
    if (config.notifyWorkTrail) for (const trail of trails.filter((item) => item.remindAt)) {
      const id = `trail:${trail.id}:${trail.remindAt}`
      if (!notifiedIds.has(id) && now.getTime() >= parseLocalDateTime(trail.remindAt!).getTime()) { await sendFeishuCard(config, feishuCards.workTrail(trail.stakeholderName, trail.title)); notifiedIds.add(id) }
    }
  }
  void tick()
  const timer = window.setInterval(() => void tick(), 30_000)
  return () => { stopped = true; window.clearInterval(timer) }
}
