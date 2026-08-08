import { db } from '../db'
import { decryptBackupFile, readBackup, summarizeBackup, validateBackup, type BackupPayload } from './backupService'

/**
 * 还原服务的独立入口：供设置页或后续的桌面端壳层复用。
 * 所有写入 IndexedDB 的记录先转成 JSON-safe 的普通对象，避免 Vue Proxy
 * 或函数、DOM 节点等不可结构化克隆的值触发 DataCloneError。
 */
export { decryptBackupFile, readBackup, summarizeBackup, validateBackup }
export type { BackupPayload, BackupSummary } from './backupService'

function cloneForIndexedDb<T>(value: T): T {
  try {
    const serialized = JSON.stringify(value, (_key, candidate) => {
      if (typeof candidate === 'function' || typeof candidate === 'symbol' || typeof candidate === 'bigint') return undefined
      if (typeof Element !== 'undefined' && candidate instanceof Element) return undefined
      if (typeof Node !== 'undefined' && candidate instanceof Node) return undefined
      return candidate
    })
    if (serialized === undefined) return undefined as T
    return JSON.parse(serialized) as T
  } catch {
    throw new Error('备份记录包含无法安全写入的数据，恢复已停止。')
  }
}

export async function restoreBackup(payload: BackupPayload, mode: 'replace' | 'merge') {
  const cleanPayload = cloneForIndexedDb(payload)
  validateBackup(cleanPayload)
  const knownTableNames = new Set(db.tables.map((table) => table.name))
  await db.transaction('rw', db.tables, async () => {
    if (mode === 'replace') await Promise.all(db.tables.map((table) => table.clear()))
    for (const [name, records] of Object.entries(cleanPayload.tables)) {
      if (!knownTableNames.has(name) || !Array.isArray(records) || !records.length) continue
      const cleanRecords = records.map((item) => cloneForIndexedDb(item))
      await db.table(name).bulkPut(cleanRecords as never[])
    }
    if (!Array.isArray(cleanPayload.tables.settings)) {
      const current = await db.settings.get('system')
      await db.settings.put(cloneForIndexedDb({
        ...(current ?? { id: 'system', currentTermId: '', themeMode: 'warm', autoBackupIntervalDays: 1, customCategories: [] }),
        schoolProfile: cleanPayload.settings?.schoolConfig,
        teachingProfile: { ...(current?.teachingProfile ?? {}), periods: cleanPayload.settings?.teachingPeriods ?? [] },
        feishuConfig: cleanPayload.settings?.feishuConfig ?? {},
        consultationCategories: cleanPayload.settings?.categories ?? [],
      }) as never)
    }
  })
  if (cleanPayload.localStorage?.hasSeenLaunchNotice !== undefined) {
    const value = cleanPayload.localStorage.hasSeenLaunchNotice
    if (value === null) localStorage.removeItem('hasSeenLaunchNotice'); else localStorage.setItem('hasSeenLaunchNotice', value)
  }
}
