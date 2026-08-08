import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import type { SystemConfigRecord } from '../types/schema'

export const defaultConsultationCategories = ['学业压力', '人际交往', '亲子关系', '情绪困扰', '自我认知', '适应问题', '危机干预']
const fallback = (): SystemConfigRecord => ({ id: 'system', currentTermId: '', themeMode: 'warm', autoBackupIntervalDays: 1, customCategories: [], consultationCategories: [...defaultConsultationCategories] })

export const useCategoryStore = defineStore('category', () => {
  const categories = ref<string[]>([...defaultConsultationCategories])
  const usageCount = ref<Record<string, number>>({})
  async function refreshUsage() {
    const counts: Record<string, number> = {}
    for (const record of await db.consultations.toArray()) for (const category of record.problemCategories) counts[category] = (counts[category] ?? 0) + 1
    usageCount.value = counts
  }
  async function load() { const config = await db.settings.get('system'); categories.value = [...(config?.consultationCategories?.length ? config.consultationCategories : defaultConsultationCategories)]; if (!config?.consultationCategories) await persist(config); await refreshUsage() }
  async function persist(existing?: SystemConfigRecord) { const config = existing ?? await db.settings.get('system') ?? fallback(); await db.settings.put({ ...config, consultationCategories: [...categories.value] }) }
  async function addCategory(name: string) { const value = name.trim(); if (!value || categories.value.includes(value)) return false; categories.value = [...categories.value, value]; await persist(); return true }
  async function deleteCategory(name: string) {
    await refreshUsage()
    if ((usageCount.value[name] ?? 0) > 0) return false
    categories.value = categories.value.filter((item) => item !== name)
    await persist()
    return true
  }
  return { categories, usageCount, load, refreshUsage, addCategory, deleteCategory }
})
