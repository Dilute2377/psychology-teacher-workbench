import { db } from '../db'

export type BackupTables = Record<string, unknown[]>
export interface BackupPayload {
  version: '2.0.0'
  exportAt: string
  systemName: '心理老师工作台'
  tables: BackupTables
  settings: {
    schoolConfig: unknown
    teachingPeriods: unknown[]
    feishuConfig: unknown
    categories: unknown[]
  }
  localStorage: Record<string, string | null>
}

export type BackupSummary = {
  exportAt: string
  students: number
  consultations: number
  workTrails: number
  attachments: number
  tableCount: number
}

const coreTables = ['students', 'consultations', 'workTrails', 'terms']
const pad = (value: number) => String(value).padStart(2, '0')
const exportTime = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`

function countAttachments(value: unknown): number {
  if (Array.isArray(value)) return value.reduce((total, item) => total + countAttachments(item), 0)
  if (!value || typeof value !== 'object') return 0
  const record = value as Record<string, unknown>
  const direct = (Array.isArray(record.attachments) ? record.attachments.length : 0) + (record.attachment ? 1 : 0)
  return direct + Object.entries(record).filter(([key]) => key !== 'attachments').reduce((total, [, item]) => total + countAttachments(item), 0)
}

export async function createBackup(): Promise<BackupPayload> {
  const tables: BackupTables = {}
  await Promise.all(db.tables.map(async (table) => { tables[table.name] = await table.toArray() }))
  const config = await db.settings.get('system')
  return {
    version: '2.0.0',
    exportAt: exportTime(),
    systemName: '心理老师工作台',
    tables,
    settings: {
      schoolConfig: config?.schoolProfile ?? {},
      teachingPeriods: config?.teachingProfile?.periods ?? [],
      feishuConfig: config?.feishuConfig ?? {},
      categories: config?.consultationCategories ?? config?.customCategories ?? [],
    },
    localStorage: { hasSeenLaunchNotice: localStorage.getItem('hasSeenLaunchNotice') },
  }
}

export function stringifyBackup(payload: BackupPayload) { return JSON.stringify(payload, null, 2) }

export function downloadBackup(payload: BackupPayload) {
  const stamp = payload.exportAt.replace(/[- :]/g, '').slice(0, 12)
  const url = URL.createObjectURL(new Blob([stringifyBackup(payload)], { type: 'application/json;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `心理老师工作台全量备份_${stamp}.mindbag`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function validateBackup(value: unknown): asserts value is BackupPayload {
  const payload = value as Partial<BackupPayload>
  if (!payload || payload.version !== '2.0.0' || payload.systemName !== '心理老师工作台' || !payload.tables || typeof payload.tables !== 'object') throw new Error('备份文件格式非法或已损坏！')
  if (!coreTables.every((name) => Array.isArray(payload.tables?.[name]))) throw new Error('备份文件格式非法或已损坏！')
}

export async function readBackup(file: File): Promise<BackupPayload> {
  let parsed: unknown
  try { parsed = JSON.parse(await file.text()) } catch { throw new Error('备份文件格式非法或已损坏！') }
  validateBackup(parsed)
  return parsed
}

export function summarizeBackup(payload: BackupPayload): BackupSummary {
  return {
    exportAt: payload.exportAt,
    students: payload.tables.students?.length ?? 0,
    consultations: payload.tables.consultations?.length ?? 0,
    workTrails: payload.tables.workTrails?.length ?? 0,
    attachments: countAttachments(payload.tables.workTrails ?? []) + countAttachments(payload.tables.teachingMaterials ?? []),
    tableCount: Object.keys(payload.tables).length,
  }
}

export async function restoreBackup(payload: BackupPayload, mode: 'replace' | 'merge') {
  validateBackup(payload)
  const knownTableNames = new Set(db.tables.map((table) => table.name))
  await db.transaction('rw', db.tables, async () => {
    if (mode === 'replace') await Promise.all(db.tables.map((table) => table.clear()))
    for (const [name, records] of Object.entries(payload.tables)) {
      if (knownTableNames.has(name) && Array.isArray(records) && records.length) await db.table(name).bulkPut(records as never[])
    }
    if (!Array.isArray(payload.tables.settings)) {
      const current = await db.settings.get('system')
      await db.settings.put({
        ...(current ?? { id: 'system', currentTermId: '', themeMode: 'warm', autoBackupIntervalDays: 14, customCategories: [] }),
        schoolProfile: payload.settings.schoolConfig as never,
        teachingProfile: { ...(current?.teachingProfile ?? {}), periods: payload.settings.teachingPeriods } as never,
        feishuConfig: payload.settings.feishuConfig as never,
        consultationCategories: payload.settings.categories as string[],
      })
    }
  })
  if (payload.localStorage?.hasSeenLaunchNotice !== undefined) {
    const value = payload.localStorage.hasSeenLaunchNotice
    if (value === null) localStorage.removeItem('hasSeenLaunchNotice'); else localStorage.setItem('hasSeenLaunchNotice', value)
  }
}
