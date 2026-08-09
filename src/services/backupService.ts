import { db } from '../db'
import { decryptData, encryptData } from './cryptoService'

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

export interface EncryptedBackupFile {
  fileName: string
  fileContent: string
  exportAt: string
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

function safeTableRows(name: string, rows: unknown[]) {
  if (name !== 'settings') return rows
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row
    const { autoBackupSecret: _autoBackupSecret, ...safe } = row as Record<string, unknown>
    return safe
  })
}

export async function createBackup(): Promise<BackupPayload> {
  const tables: BackupTables = {}
  await Promise.all(db.tables.map(async (table) => { tables[table.name] = safeTableRows(table.name, await table.toArray()) }))
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
    localStorage: {
      hasSeenLaunchNotice: localStorage.getItem('hasSeenLaunchNotice'),
      crisisConfig: localStorage.getItem('crisisConfig'),
    },
  }
}

export function stringifyBackup(payload: BackupPayload) { return JSON.stringify(payload) }

export async function createEncryptedBackup(password: string, recoveryPassword?: string): Promise<EncryptedBackupFile> {
  const payload = await createBackup()
  const fileContent = await encryptData(stringifyBackup(payload), password, recoveryPassword)
  const stamp = payload.exportAt.replace(/[- :]/g, '').slice(0, 14)
  return { fileName: `心理老师工作台全量备份_${stamp}.mindbag`, fileContent, exportAt: payload.exportAt }
}

export function downloadEncryptedBackup(file: EncryptedBackupFile) {
  const url = URL.createObjectURL(new Blob([file.fileContent], { type: 'application/octet-stream' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.fileName
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  return { mode: 'download' as const }
}

export async function saveEncryptedBackup(file: EncryptedBackupFile, folderPath?: string) {
  if (folderPath && window.electronAPI) {
    const result = await window.electronAPI.saveBackupFile({ folderPath, fileName: file.fileName, fileContent: file.fileContent })
    return { mode: 'electron' as const, path: result.path }
  }
  return downloadEncryptedBackup(file)
}

export async function selectBackupFolder() {
  if (!window.electronAPI) return { canceled: false, folderPath: '' }
  return window.electronAPI.selectBackupFolder()
}

export async function decryptBackupFile(fileContent: string, password: string) {
  const plaintext = await decryptData(fileContent, password)
  let parsed: unknown
  try { parsed = JSON.parse(plaintext) } catch { throw new Error('解密成功，但备份内容格式无效。') }
  validateBackup(parsed)
  return parsed
}

export function validateBackup(value: unknown): asserts value is BackupPayload {
  const payload = value as Partial<BackupPayload>
  if (!payload || payload.version !== '2.0.0' || payload.systemName !== '心理老师工作台' || !payload.tables || typeof payload.tables !== 'object') throw new Error('备份文件格式非法或已损坏！')
  if (!coreTables.every((name) => Array.isArray(payload.tables?.[name]))) throw new Error('备份文件格式非法或已损坏！')
}

/** 兼容上一版本未加密备份的读取入口，新的设置页默认只使用加密备份。 */
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
