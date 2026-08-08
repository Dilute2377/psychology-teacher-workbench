const PBKDF2_ITERATIONS = 100_000
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export class DecryptionFailedError extends Error {
  constructor(message = '解密失败：主密码或恢复码错误，无法读取备份数据！') {
    super(message)
    this.name = 'DecryptionFailedError'
  }
}

type WrappedKey = { salt: string; iv: string; ciphertext: string }
type EncryptedPayload = {
  version: '3.0.0'
  algorithm: 'AES-256-GCM'
  kdf: 'PBKDF2-SHA-256'
  iterations: number
  salt: string
  iv: string
  ciphertext: string
  keyWrap: WrappedKey
  recoveryKeyWrap?: WrappedKey
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

export function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function generateRandomSecret(length = 32) {
  return bytesToBase64(randomBytes(length))
}

export async function generateKeyFromPassword(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: new Uint8Array(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

async function wrapDataKey(rawKey: ArrayBuffer, password: string): Promise<WrappedKey> {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = await generateKeyFromPassword(password, salt)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, rawKey)
  return { salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) }
}

async function unwrapDataKey(wrapped: WrappedKey, password: string) {
  const key = await generateKeyFromPassword(password, base64ToBytes(wrapped.salt))
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(wrapped.iv) }, key, base64ToBytes(wrapped.ciphertext))
}

export async function hashSecret(secret: string, salt: Uint8Array) {
  const input = new Uint8Array(salt.length + encoder.encode(secret).length)
  input.set(salt)
  input.set(encoder.encode(secret), salt.length)
  return bytesToBase64(new Uint8Array(await crypto.subtle.digest('SHA-256', input)))
}

export async function encryptData(dataJsonString: string, password: string, recoveryPassword?: string) {
  if (!password || password.length < 4) throw new Error('数据加密主密码至少需要 4 位。')
  const contentKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const rawKey = await crypto.subtle.exportKey('raw', contentKey)
  const iv = randomBytes(12)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, contentKey, encoder.encode(dataJsonString))
  const keyWrap = await wrapDataKey(rawKey, password)
  const payload: EncryptedPayload = {
    version: '3.0.0',
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    salt: keyWrap.salt,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    keyWrap,
  }
  if (recoveryPassword && recoveryPassword !== password) payload.recoveryKeyWrap = await wrapDataKey(rawKey, recoveryPassword)
  return JSON.stringify(payload)
}

export async function decryptData(encryptedPayload: string, password: string) {
  try {
    const payload = JSON.parse(encryptedPayload) as Partial<EncryptedPayload>
    if (payload.version !== '3.0.0' || payload.algorithm !== 'AES-256-GCM' || !payload.keyWrap || !payload.iv || !payload.ciphertext) throw new Error('invalid payload')
    const wraps = [payload.keyWrap, payload.recoveryKeyWrap].filter((item): item is WrappedKey => Boolean(item))
    for (const wrap of wraps) {
      try {
        const rawKey = await unwrapDataKey(wrap, password)
        const contentKey = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt'])
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(payload.iv) }, contentKey, base64ToBytes(payload.ciphertext))
        return decoder.decode(plaintext)
      } catch {
        // 尝试下一个密钥封装（主密码或恢复码）。
      }
    }
  } catch {
    // 统一抛出不泄露格式细节的错误。
  }
  throw new DecryptionFailedError()
}
