<script setup lang="ts">
import { ref } from 'vue'
import { Download, Upload, X } from '@lucide/vue'
import { createBackup, downloadBackup, readBackup, restoreBackup, summarizeBackup, type BackupPayload, type BackupSummary } from '../../services/backupService'
import RestoreConfirmModal from './RestoreConfirmModal.vue'

const props = withDefaults(defineProps<{ initialAction?: 'export' | 'restore' }>(), { initialAction: 'export' })
const emit = defineEmits<{ close: []; restored: [] }>()
const parsedBackup = ref<BackupPayload>()
const summary = ref<BackupSummary>()
const mode = ref<'replace' | 'merge'>('replace')
const message = ref('')
const busy = ref(false)
const showConfirm = ref(false)

async function exportData() {
  busy.value = true; message.value = ''
  try {
    const payload = await createBackup()
    downloadBackup(payload)
    localStorage.setItem('lastMindbagExportAt', payload.exportAt)
    message.value = '全量备份文件已开始下载。'
  } catch (error) { message.value = error instanceof Error ? error.message : '导出失败。' } finally { busy.value = false }
}

async function selectFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  message.value = ''; parsedBackup.value = undefined; summary.value = undefined
  try {
    const payload = await readBackup(file)
    parsedBackup.value = payload; summary.value = summarizeBackup(payload)
  } catch (error) { message.value = error instanceof Error ? error.message : '读取备份失败。' }
}

async function restoreData() {
  if (!parsedBackup.value) return
  busy.value = true; showConfirm.value = false; message.value = ''
  try {
    await restoreBackup(parsedBackup.value, mode.value)
    emit('restored')
    message.value = '数据已成功恢复！应用即将自动刷新以加载最新配置。'
    window.setTimeout(() => window.location.reload(), 900)
  } catch (error) { message.value = error instanceof Error ? error.message : '恢复失败。' } finally { busy.value = false }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/35 p-4" @click.self="emit('close')">
      <section class="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <header class="flex items-start justify-between gap-4">
          <div><h2 class="text-lg font-semibold text-stone-800">{{ props.initialAction === 'export' ? '导出全量本地备份' : '恢复备份数据' }}</h2></div>
          <button type="button" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" @click="emit('close')"><X :size="18" /></button>
        </header>
        <p v-if="message" class="mt-4 rounded-lg px-3 py-2 text-sm" :class="message.includes('成功') || message.includes('已开始') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'">{{ message }}</p>
        <section v-if="props.initialAction === 'export'" class="mt-5 rounded-xl border border-teal-100 bg-teal-50/40 p-5">
          <Download :size="22" class="text-teal-700" /><h3 class="mt-3 text-sm font-semibold text-stone-800">导出全量备份文件</h3>
          <button type="button" :disabled="busy" class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="exportData"><Download :size="16" />导出 .mindbag</button>
        </section>
        <section v-else class="mt-5 rounded-xl border border-amber-200 bg-amber-50/40 p-5">
          <Upload :size="22" class="text-amber-800" /><h3 class="mt-3 text-sm font-semibold text-stone-800">选择备份文件</h3>
          <input type="file" accept=".mindbag,.json,application/json" class="mt-3 block w-full text-sm" @change="selectFile" />
          <div v-if="summary" class="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-white p-3 text-xs text-stone-600"><span>备份时间：{{ summary.exportAt }}</span><span>数据表：{{ summary.tableCount }} 张</span><span>学生：{{ summary.students }} 人</span><span>咨询：{{ summary.consultations }} 条</span><span>留痕：{{ summary.workTrails }} 条</span><span>附件：{{ summary.attachments }} 个</span></div>
          <button type="button" :disabled="!parsedBackup || busy" class="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50" @click="showConfirm = true"><Upload :size="16" />继续恢复</button>
        </section>
      </section>
    </div>
  </Teleport>
  <RestoreConfirmModal v-if="showConfirm && summary" v-model:mode="mode" :summary="summary" @cancel="showConfirm = false" @confirm="restoreData" />
</template>
