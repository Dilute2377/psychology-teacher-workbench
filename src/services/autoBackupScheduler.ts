import type { Pinia } from 'pinia'
import { useSettingsStore } from '../stores/useSettingsStore'
import { createEncryptedBackup, saveEncryptedBackup } from './backupService'
import { getPersistedBackupPassword, getSessionSecrets, isSecuritySetupComplete } from './securityService'

function notify(message: string, tone: 'success' | 'error' | 'info' = 'info') {
  window.dispatchEvent(new CustomEvent('backup-toast', { detail: { message, tone } }))
}

export function startAutoBackupScheduler(pinia: Pinia) {
  let stopped = false
  let running = false
  async function tick() {
    if (stopped || running) return
    if (!isSecuritySetupComplete()) return
    const settings = useSettingsStore(pinia)
    if (!settings.loaded) await settings.load()
    if (!settings.autoBackupEnabled) return
    if (window.electronAPI && !settings.autoBackupFolderPath) return
    const last = settings.lastAutoBackupTime ? new Date(settings.lastAutoBackupTime).getTime() : 0
    if (Date.now() - last < settings.autoBackupIntervalDays * 86_400_000) return
    running = true
    try {
      const password = await getPersistedBackupPassword()
      if (!password) return
      const file = await createEncryptedBackup(password, getSessionSecrets().recoveryCode || undefined)
      const saved = await saveEncryptedBackup(file, settings.autoBackupFolderPath || undefined)
      await settings.saveAutoBackupSettings({ lastTime: new Date().toISOString() })
      notify(saved.mode === 'electron' ? `🔒 已静默自动备份至：${saved.path}` : '🔒 已完成全量数据加密自动备份', 'success')
    } catch (error) {
      notify(error instanceof Error ? `自动备份失败：${error.message}` : '自动备份失败。', 'error')
    } finally { running = false }
  }
  void tick()
  const timer = window.setInterval(() => void tick(), 60_000)
  return () => { stopped = true; window.clearInterval(timer) }
}
