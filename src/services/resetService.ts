import { db } from '../db'

const initialConfig = () => ({ id: 'system' as const, currentTermId: '', themeMode: 'warm' as const, autoBackupIntervalDays: 1, autoBackupEnabled: true, customCategories: [] as string[] })

async function deleteMarkedRows() {
  const removed: Record<string, number> = {}
  const mockStudentIds = new Set((await db.students.toArray()).filter((student) => student.isMock).map((student) => student.id))
  for (const table of db.tables) {
    if (table.name === 'settings') continue
    const rows = await table.toArray() as Array<Record<string, unknown> & { id: string }>
    const ids = rows.filter((row) => row.isMock === true || (typeof row.studentId === 'string' && mockStudentIds.has(row.studentId))).map((row) => row.id)
    if (ids.length) { await table.bulkDelete(ids); removed[table.name] = ids.length }
  }
  localStorage.removeItem('mockDataGeneratedAt')
  return removed
}

export async function clearMockDataOnly() {
  return db.transaction('rw', db.tables, () => deleteMarkedRows())
}

export async function factoryReset() {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    await db.settings.put(initialConfig())
  })
  const preservedKeys = new Set(['hasCompletedSecuritySetup', 'securityPasswordHash', 'securityPasswordSalt', 'securityRecoveryHash', 'securityRecoverySalt'])
  for (const key of Object.keys(localStorage)) if (!preservedKeys.has(key)) localStorage.removeItem(key)
  return true
}
