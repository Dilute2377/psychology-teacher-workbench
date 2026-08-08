import { db } from '../db'
import { base64ToBytes, bytesToBase64, generateRandomSecret, hashSecret } from './cryptoService'

const SETUP_FLAG = 'hasCompletedSecuritySetup'
const PASSWORD_HASH = 'securityPasswordHash'
const PASSWORD_SALT = 'securityPasswordSalt'
const RECOVERY_HASH = 'securityRecoveryHash'
const RECOVERY_SALT = 'securityRecoverySalt'

let sessionPassword = ''
let sessionRecoveryCode = ''

function randomSalt() {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  return salt
}

function normalizeRecoveryCode(value: string) { return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() }

export function isSecuritySetupComplete() { return localStorage.getItem(SETUP_FLAG) === 'true' }
export function getSessionSecrets() { return { password: sessionPassword, recoveryCode: sessionRecoveryCode } }
export function setSessionPassword(password: string) { sessionPassword = password }
export async function persistBackupPassword(password: string) { sessionPassword = password; if (window.electronAPI) await window.electronAPI.storeBackupPassword(password) }
export async function getPersistedBackupPassword() { if (sessionPassword) return sessionPassword; if (!window.electronAPI) return ''; return (await window.electronAPI.getBackupPassword()).password }

export function generateRecoveryCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const random = new Uint8Array(24)
  crypto.getRandomValues(random)
  const raw = Array.from(random, (value) => alphabet[value % alphabet.length]).join('')
  return raw.match(/.{1,4}/g)?.join('-') ?? raw
}

export async function completeSecuritySetup(password: string) {
  if (password.length < 4 || password.length > 16) throw new Error('数据加密主密码长度需为 4 至 16 位。')
  const recoveryCode = generateRecoveryCode()
  const passwordSalt = randomSalt()
  const recoverySalt = randomSalt()
  localStorage.setItem(PASSWORD_SALT, bytesToBase64(passwordSalt))
  localStorage.setItem(PASSWORD_HASH, await hashSecret(password, passwordSalt))
  localStorage.setItem(RECOVERY_SALT, bytesToBase64(recoverySalt))
  localStorage.setItem(RECOVERY_HASH, await hashSecret(normalizeRecoveryCode(recoveryCode), recoverySalt))
  localStorage.setItem(SETUP_FLAG, 'true')
  await persistBackupPassword(password)
  sessionRecoveryCode = recoveryCode

  const current = await db.settings.get('system')
  await db.settings.put({
    ...(current ?? { id: 'system', currentTermId: '', themeMode: 'warm', autoBackupIntervalDays: 1, customCategories: [] }),
    autoBackupEnabled: current?.autoBackupEnabled ?? true,
    autoBackupIntervalDays: current?.autoBackupIntervalDays ?? 1,
    autoBackupSecret: current?.autoBackupSecret ?? generateRandomSecret(32),
  })
  return recoveryCode
}

export async function verifySecuritySecret(candidate: string) {
  const normalized = candidate.trim()
  const passwordSaltValue = localStorage.getItem(PASSWORD_SALT)
  const passwordHash = localStorage.getItem(PASSWORD_HASH)
  const recoverySaltValue = localStorage.getItem(RECOVERY_SALT)
  const recoveryHash = localStorage.getItem(RECOVERY_HASH)
  if (passwordSaltValue && passwordHash && passwordHash === await hashSecret(normalized, base64ToBytes(passwordSaltValue))) return true
  if (recoverySaltValue && recoveryHash && recoveryHash === await hashSecret(normalizeRecoveryCode(normalized), base64ToBytes(recoverySaltValue))) return true
  return false
}

export async function getAutoBackupSecret() {
  const current = await db.settings.get('system')
  if (current?.autoBackupSecret) return current.autoBackupSecret
  const secret = generateRandomSecret(32)
  await db.settings.put({ ...(current ?? { id: 'system', currentTermId: '', themeMode: 'warm', autoBackupIntervalDays: 1, customCategories: [] }), autoBackupSecret: secret })
  return secret
}
