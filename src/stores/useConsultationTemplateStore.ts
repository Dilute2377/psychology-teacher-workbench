import { ref } from 'vue'
import { defineStore } from 'pinia'
import { db } from '../db'
import type { SoapField, SoapTemplates, SystemConfigRecord } from '../types/schema'

export const defaultSoapTemplates: SoapTemplates = {
  subjective: '【来访主诉】：\n【情绪感受】：\n【引发事件】：',
  objective: '【神态举止】：\n【言语表达】：\n【躯体/生理表现】：',
  assessment: '【核心困扰类型】：\n【危机程度评估】：\n【个案概念化】：',
  plan: '【辅导策略/干预】：\n【布置家庭/课后作业】：\n【后续追踪计划】：',
}

const defaultWords = ['神情紧张', '言语连贯', '目光回避', '情绪低落', '躯体化抖腿']

function baseConfig(): SystemConfigRecord {
  return { id: 'system', currentTermId: '', themeMode: 'warm', autoBackupIntervalDays: 14, customCategories: [], soapTemplates: { ...defaultSoapTemplates }, observationWords: [...defaultWords] }
}

export const useConsultationTemplateStore = defineStore('consultationTemplate', () => {
  const templates = ref<SoapTemplates>({ ...defaultSoapTemplates })
  const observationWords = ref<string[]>([...defaultWords])

  async function load() {
    const config = await db.settings.get('system')
    templates.value = { ...defaultSoapTemplates, ...(config?.soapTemplates ?? {}) }
    observationWords.value = [...(config?.observationWords?.length ? config.observationWords : defaultWords)]
    if (!config?.soapTemplates || !config.observationWords) await persist(config)
  }

  async function persist(existing?: SystemConfigRecord) {
    const config = existing ?? await db.settings.get('system') ?? baseConfig()
    await db.settings.put({ ...config, soapTemplates: { ...templates.value }, observationWords: [...observationWords.value] })
  }

  async function saveTemplate(field: SoapField, value: string) {
    templates.value = { ...templates.value, [field]: value }
    await persist()
  }

  async function addObservationWord(value: string) {
    const word = value.trim()
    if (!word || observationWords.value.includes(word)) return false
    observationWords.value = [...observationWords.value, word]
    await persist()
    return true
  }

  async function deleteObservationWord(word: string) {
    observationWords.value = observationWords.value.filter((item) => item !== word)
    await persist()
  }

  return { templates, observationWords, load, saveTemplate, addObservationWord, deleteObservationWord }
})
