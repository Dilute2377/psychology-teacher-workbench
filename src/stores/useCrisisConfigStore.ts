import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { RiskLevel, StudentWarningLevel } from '../types/schema'

export type SeverityDirection = 'desc' | 'asc'
export type CrisisLevelKey = 'level_1' | 'level_2' | 'level_3' | 'normal'

export interface CrisisLevelLabels {
  level_1_label: string
  level_2_label: string
  level_3_label: string
  normal_label: string
}

export interface CrisisConfigSnapshot {
  severityDirection: SeverityDirection
  levelLabels: CrisisLevelLabels
}

export interface CrisisLevelBadge {
  key: CrisisLevelKey
  label: string
  shortLabel: string
  emoji: string
  color: string
  barClass: string
  weight: number
  riskValue: RiskLevel
}

export interface CrisisDropdownOption {
  label: string
  value: CrisisLevelKey
  emoji: string
  riskValue: RiskLevel
}

const STORAGE_KEY = 'crisisConfig'
const DEFAULT_SNAPSHOT: CrisisConfigSnapshot = {
  severityDirection: 'desc',
  levelLabels: { level_1_label: '重大', level_2_label: '严重', level_3_label: '一般', normal_label: '正常' },
}

const LEVEL_KEYS: CrisisLevelKey[] = ['level_1', 'level_2', 'level_3', 'normal']

export function defaultCrisisConfig(): CrisisConfigSnapshot {
  return { severityDirection: 'desc', levelLabels: { ...DEFAULT_SNAPSHOT.levelLabels } }
}

export function readCrisisConfig(): CrisisConfigSnapshot {
  if (typeof localStorage === 'undefined') return defaultCrisisConfig()
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<CrisisConfigSnapshot>
    return {
      severityDirection: parsed.severityDirection === 'asc' ? 'asc' : 'desc',
      levelLabels: { ...DEFAULT_SNAPSHOT.levelLabels, ...(parsed.levelLabels ?? {}) },
    }
  } catch {
    return defaultCrisisConfig()
  }
}

export function levelKeyForStoredValue(value: string | null | undefined, snapshot = readCrisisConfig()): CrisisLevelKey {
  if (value === 'level_1' || value === 'level_2' || value === 'level_3' || value === 'normal') return value
  if (value === 'normal' || value === 'none') return 'normal'
  if (value === 'warning' || value === 'orange') return 'level_2'
  if (value === 'crisis' || value === 'red') return snapshot.severityDirection === 'desc' ? 'level_1' : 'level_3'
  if (value === 'attention' || value === 'yellow') return snapshot.severityDirection === 'desc' ? 'level_3' : 'level_1'
  return 'normal'
}

function severityWeight(key: CrisisLevelKey, direction: SeverityDirection) {
  if (key === 'normal') return 0
  const high = direction === 'desc' ? 'level_1' : 'level_3'
  const low = direction === 'desc' ? 'level_3' : 'level_1'
  return key === high ? 3 : key === low ? 1 : 2
}

function colorForWeight(weight: number) {
  if (weight >= 3) return { emoji: '🔴', color: '#dc5c68', barClass: 'bg-rose-500' }
  if (weight === 2) return { emoji: '🟠', color: '#ed9a48', barClass: 'bg-orange-400' }
  if (weight === 1) return { emoji: '🟡', color: '#d6b24c', barClass: 'bg-amber-400' }
  return { emoji: '🟢', color: '#61a77f', barClass: 'bg-emerald-500' }
}

export function crisisBadgeFromKey(levelKey: CrisisLevelKey, snapshot = readCrisisConfig()): CrisisLevelBadge {
  const key = levelKey === 'normal' ? 'normal' : levelKey
  const weight = severityWeight(key, snapshot.severityDirection)
  const color = colorForWeight(weight)
  const label = key === 'normal' ? snapshot.levelLabels.normal_label : snapshot.levelLabels[`${key}_label`]
  return { key, label, shortLabel: label, ...color, weight, riskValue: key === 'normal' ? 'normal' : weight >= 3 ? 'crisis' : weight === 2 ? 'warning' : 'attention' }
}

export function crisisDropdownOptions(snapshot = readCrisisConfig()): CrisisDropdownOption[] {
  const low = snapshot.severityDirection === 'desc' ? 'level_3' : 'level_1'
  const high = snapshot.severityDirection === 'desc' ? 'level_1' : 'level_3'
  const ordered: CrisisLevelKey[] = ['normal', low, 'level_2', high]
  return ordered.map((value) => { const badge = crisisBadgeFromKey(value, snapshot); return { label: badge.label, value, emoji: badge.emoji, riskValue: badge.riskValue } })
}

export const useCrisisConfigStore = defineStore('crisisConfig', () => {
  const severityDirection = ref<SeverityDirection>('desc')
  const levelLabels = ref<CrisisLevelLabels>({ ...DEFAULT_SNAPSHOT.levelLabels })
  const loaded = ref(false)
  const highRiskLevel = computed<CrisisLevelKey>(() => severityDirection.value === 'desc' ? 'level_1' : 'level_3')

  function getSnapshot(): CrisisConfigSnapshot { return { severityDirection: severityDirection.value, levelLabels: { ...levelLabels.value } } }
  function getHighRiskLevel() { return highRiskLevel.value }
  function getLevelBadge(levelKey: string | null | undefined) { return crisisBadgeFromKey(levelKeyForStoredValue(levelKey), getSnapshot()) }
  function getDropdownOptions() { return crisisDropdownOptions(getSnapshot()) }
  function resolveLevelKey(value: string | null | undefined) { return levelKeyForStoredValue(value, getSnapshot()) }
  function getStudentWarningBadge(value: StudentWarningLevel | RiskLevel | string | null | undefined) { return getLevelBadge(resolveLevelKey(value)) }

  function load() {
    const config = readCrisisConfig()
    severityDirection.value = config.severityDirection
    levelLabels.value = { ...config.levelLabels }
    loaded.value = true
  }

  function save(next: { severityDirection?: SeverityDirection; levelLabels?: Partial<CrisisLevelLabels> } = {}) {
    if (next.severityDirection) severityDirection.value = next.severityDirection
    if (next.levelLabels) levelLabels.value = { ...levelLabels.value, ...next.levelLabels }
    const snapshot = getSnapshot()
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    loaded.value = true
  }

  return { severityDirection, levelLabels, loaded, highRiskLevel, getSnapshot, getHighRiskLevel, getLevelBadge, getDropdownOptions, getStudentWarningBadge, resolveLevelKey, load, save, LEVEL_KEYS }
})
