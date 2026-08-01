import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import type { SystemConfigRecord } from '../types/schema'

export type FeishuConfig = NonNullable<SystemConfigRecord['feishuConfig']>
const defaults = (): FeishuConfig => ({ enabled: false, webhookUrl: '', secret: '', notifyConsultation: true, notifyTeaching: true, consultationLeadMinutes: 15, teachingLeadMinutes: 10, dailyDigestEnabled: false, dailyDigestTime: '08:30', notifyWorkTrail: true })

export const useSettingsStore = defineStore('settings', () => {
  const feishuConfig = ref<FeishuConfig>(defaults())
  const loaded = ref(false)
  async function load() { const config = await db.settings.get('system'); feishuConfig.value = { ...defaults(), ...(config?.feishuConfig ?? {}) }; loaded.value = true }
  async function saveFeishuConfig(next: Partial<FeishuConfig>) { const config = await db.settings.get('system') ?? { id: 'system' as const, currentTermId: '', themeMode: 'warm' as const, autoBackupIntervalDays: 14, customCategories: [] }; feishuConfig.value = { ...feishuConfig.value, ...next }; await db.settings.put({ ...config, feishuConfig: { ...feishuConfig.value } }) }
  return { feishuConfig, loaded, load, saveFeishuConfig }
})
