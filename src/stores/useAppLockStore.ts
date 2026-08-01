import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'

const hashPin = async (pin: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))), (byte) => byte.toString(16).padStart(2, '0')).join('')
const validPin = (pin: string) => /^\d{4,6}$/.test(pin)

export const useAppLockStore = defineStore('appLock', () => {
  const isLocked = ref(false)
  const pinHash = ref('')
  const isConfigured = computed(() => Boolean(pinHash.value))
  async function load() { pinHash.value = (await db.settings.get('system'))?.appLockPinHash ?? '' }
  async function setPin(pin: string) { if (!validPin(pin)) throw new Error('请设置 4 至 6 位数字 PIN。'); const hash = await hashPin(pin); const current = await db.settings.get('system'); await db.settings.put({ ...(current ?? { id: 'system', currentTermId: '', themeMode: 'warm', autoBackupIntervalDays: 14, customCategories: [] }), appLockPinHash: hash }); pinHash.value = hash }
  async function verify(pin: string) { return validPin(pin) && Boolean(pinHash.value) && await hashPin(pin) === pinHash.value }
  function lock() { isLocked.value = true }
  function unlock() { isLocked.value = false }
  return { isLocked, isConfigured, load, setPin, verify, lock, unlock }
})
