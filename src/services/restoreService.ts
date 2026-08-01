/**
 * 还原服务的独立入口：供设置页或后续的桌面端壳层复用。
 * 校验、摘要、覆盖/合并写入均由同一套备份协议实现，避免出现两种数据格式。
 */
export { readBackup, restoreBackup, summarizeBackup, validateBackup } from './backupService'
export type { BackupPayload, BackupSummary } from './backupService'
