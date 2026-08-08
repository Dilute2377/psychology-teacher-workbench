import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import type { SystemConfigRecord } from '../types/schema'

export type FeishuConfig = NonNullable<SystemConfigRecord['feishuConfig']>
const defaults = (): FeishuConfig => ({ enabled: false, webhookUrl: '', secret: '', notifyConsultation: true, notifyTeaching: true, consultationLeadMinutes: 15, teachingLeadMinutes: 10, dailyDigestEnabled: false, dailyDigestTime: '08:30', notifyWorkTrail: true })

export const useSettingsStore = defineStore('settings', () => {
  const feishuConfig = ref<FeishuConfig>(defaults())
  const autoBackupEnabled = ref(true)
  const autoBackupIntervalDays = ref(1)
  const lastAutoBackupTime = ref('')
  const autoBackupFolderPath = ref('')
  const loaded = ref(false)
  async function load() { const config = await db.settings.get('system'); feishuConfig.value = { ...defaults(), ...(config?.feishuConfig ?? {}) }; autoBackupEnabled.value = config?.autoBackupEnabled ?? true; autoBackupIntervalDays.value = Math.min(30, Math.max(1, config?.autoBackupIntervalDays ?? 1)); lastAutoBackupTime.value = config?.lastAutoBackupTime ?? ''; autoBackupFolderPath.value = config?.autoBackupFolderPath ?? ''; loaded.value = true }
  async function saveFeishuConfig(next: Partial<FeishuConfig>) { const config = await db.settings.get('system') ?? { id: 'system' as const, currentTermId: '', themeMode: 'warm' as const, autoBackupIntervalDays: 1, customCategories: [] }; feishuConfig.value = { ...feishuConfig.value, ...next }; await db.settings.put({ ...config, feishuConfig: { ...feishuConfig.value } }) }
  async function saveAutoBackupSettings(next: { enabled?: boolean; intervalDays?: number; folderPath?: string; lastTime?: string }) {
    const config = await db.settings.get('system') ?? { id: 'system' as const, currentTermId: '', themeMode: 'warm' as const, autoBackupIntervalDays: 1, customCategories: [] }
    autoBackupEnabled.value = next.enabled ?? autoBackupEnabled.value
    autoBackupIntervalDays.value = Math.min(30, Math.max(1, Number(next.intervalDays ?? autoBackupIntervalDays.value) || 1))
    autoBackupFolderPath.value = next.folderPath ?? autoBackupFolderPath.value
    lastAutoBackupTime.value = next.lastTime ?? lastAutoBackupTime.value
    await db.settings.put({ ...config, autoBackupEnabled: autoBackupEnabled.value, autoBackupIntervalDays: autoBackupIntervalDays.value, autoBackupFolderPath: autoBackupFolderPath.value, lastAutoBackupTime: lastAutoBackupTime.value })
  }
  return { feishuConfig, autoBackupEnabled, autoBackupIntervalDays, lastAutoBackupTime, autoBackupFolderPath, loaded, load, saveFeishuConfig, saveAutoBackupSettings }
})
