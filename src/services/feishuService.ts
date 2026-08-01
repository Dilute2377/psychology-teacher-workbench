import type { FeishuConfig } from '../stores/useSettingsStore'

type CardColor = 'blue' | 'green' | 'orange' | 'red'
type CardPayload = { title: string; color: CardColor; lines: string[] }

function toBase64(buffer: ArrayBuffer) { const bytes = new Uint8Array(buffer); let text = ''; for (const byte of bytes) text += String.fromCharCode(byte); return btoa(text) }
async function signature(secret: string, timestamp: string) { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`${timestamp}\n${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return toBase64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(''))) }
export function buildFeishuCard(payload: CardPayload) {
  return { msg_type: 'interactive', card: { schema: '2.0', config: { update_multi: true }, header: { title: { tag: 'plain_text', content: payload.title }, template: payload.color }, body: { direction: 'vertical', padding: '12px 12px 12px 12px', elements: [{ tag: 'markdown', content: payload.lines.join('\n') }] } } }
}
export async function sendFeishuCard(config: FeishuConfig, payload: CardPayload) {
  if (!config.enabled) throw new Error('请先开启飞书消息推送。')
  if (!/^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\//.test(config.webhookUrl.trim())) throw new Error('请输入有效的飞书自定义机器人 Webhook 地址。')
  const timestamp = String(Math.floor(Date.now() / 1000)); const body: Record<string, unknown> = buildFeishuCard(payload)
  if (config.secret.trim()) { body.timestamp = timestamp; body.sign = await signature(config.secret.trim(), timestamp) }
  const response = await fetch(config.webhookUrl.trim(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error(`飞书返回 HTTP ${response.status}`)
  const data = await response.json() as { code?: number; StatusCode?: number; msg?: string; StatusMessage?: string }
  if ((data.code ?? data.StatusCode ?? 0) !== 0) throw new Error(data.msg ?? data.StatusMessage ?? '飞书拒绝了消息请求。')
  return data
}
export const feishuCards = {
  consultation: (student: string, appointment: string, location = '咨询室一') => ({ title: '🩺 个体咨询预约提醒', color: 'green' as const, lines: [`**学生：** ${student}`, `**时间：** ${appointment}`, `**咨询地点：** ${location}`] }),
  teaching: (className: string, period: string, plan: string) => ({ title: '⏰ 心理课上课提醒', color: 'blue' as const, lines: [`**班级：** ${className}`, `**节次：** ${period}`, `**教案：** 《${plan}》`] }),
  workTrail: (stakeholder: string, title: string) => ({ title: '🛡️ 工作留痕与待办提醒', color: 'orange' as const, lines: [`**对接人：** ${stakeholder}`, `**事由：** ${title}`, '**状态：** 待跟进'] }),
  dailyDigest: (date: string, teachingLines: string[], consultationLines: string[]) => ({
    title: '☀️ 今日心理工作日程', color: 'blue' as const,
    lines: [
      `**日期：** ${date}`,
      '',
      '**心理课：**',
      ...(teachingLines.length ? teachingLines.map((line) => `• ${line}`) : ['• 今日暂无心理课']),
      '',
      '**个体咨询：**',
      ...(consultationLines.length ? consultationLines.map((line) => `• ${line}`) : ['• 今日暂无预约咨询']),
    ],
  }),
  test: () => ({ title: '🧪 心理老师工作台 · 飞书测试', color: 'green' as const, lines: ['飞书通知机器人已连接。', `**发送时间：** ${new Date().toLocaleString('zh-CN', { hour12: false })}`] }),
}
