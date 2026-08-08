<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download, LockKeyhole, X } from '@lucide/vue'
import { createEncryptedBackup, saveEncryptedBackup, type BackupPayload, type BackupSummary } from '../../services/backupService'
import { decryptBackupFile, readBackup, restoreBackup, summarizeBackup } from '../../services/restoreService'
import { getSessionSecrets, persistBackupPassword } from '../../services/securityService'
import RestoreConfirmModal from './RestoreConfirmModal.vue'

const props = withDefaults(defineProps<{ initialAction?: 'export' | 'restore'; folderPath?: string }>(), { initialAction: 'export', folderPath: '' })
const emit = defineEmits<{ close: []; restored: [] }>()

const fileInputRef = ref<HTMLInputElement>()
const selectedFile = ref<File>()
const encryptedContent = ref('')
const decryptPassword = ref('')
const parsedBackup = ref<BackupPayload>()
const summary = ref<BackupSummary>()
const exportPassword = ref(getSessionSecrets().password)
const exportRecoveryCode = ref(getSessionSecrets().recoveryCode)
const mode = ref<'replace' | 'merge'>('replace')
const message = ref('')
const busy = ref(false)
const showConfirm = ref(false)

const fileMeta = computed(() => ({
  exportAt: summary.value?.exportAt ?? '解密后读取',
  tableCount: summary.value ? `${summary.value.tableCount} 张` : '解密后读取',
  studentCount: summary.value ? `${summary.value.students} 人` : '解密后读取',
  consultationCount: summary.value ? `${summary.value.consultations} 条` : '解密后读取',
}))

async function exportData() {
  busy.value = true
  message.value = ''
  try {
    const secrets = getSessionSecrets()
    const password = exportPassword.value.trim() || secrets.password
    if (password.length < 4 || password.length > 16) throw new Error('请输入 4 至 16 位数据加密主密码。')
    await persistBackupPassword(password)
    const recoveryCode = exportRecoveryCode.value.trim() || secrets.recoveryCode
    const file = await createEncryptedBackup(password, recoveryCode || undefined)
    const saved = await saveEncryptedBackup(file, props.folderPath || undefined)
    localStorage.setItem('lastMindbagExportAt', file.exportAt)
    window.dispatchEvent(new CustomEvent('backup-toast', { detail: { message: saved.mode === 'electron' ? `🔒 已静默备份至：${saved.path}` : '🔒 加密备份文件已开始下载', tone: 'success' } }))
    message.value = saved.mode === 'electron' ? '加密备份已静默保存到所选目录。' : '加密备份文件已开始下载。'
  } catch (error) {
    message.value = error instanceof Error ? error.message : '导出失败。'
  } finally {
    busy.value = false
  }
}

function triggerFileInput() {
  if (!busy.value) fileInputRef.value?.click()
}

function clearSelectedFile() {
  selectedFile.value = undefined
  encryptedContent.value = ''
  decryptPassword.value = ''
  parsedBackup.value = undefined
  summary.value = undefined
  message.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  selectedFile.value = file
  encryptedContent.value = ''
  parsedBackup.value = undefined
  summary.value = undefined
  message.value = ''
  try {
    encryptedContent.value = await file.text()
  } catch (error) {
    clearSelectedFile()
    message.value = error instanceof Error ? error.message : '读取备份文件失败。'
  }
}

async function startRestore() {
  if (!selectedFile.value || !encryptedContent.value) return
  busy.value = true
  message.value = ''
  try {
    const isPlainJson = selectedFile.value.name.toLowerCase().endsWith('.json')
    const payload = isPlainJson
      ? await readBackup(selectedFile.value)
      : await decryptBackupFile(encryptedContent.value, decryptPassword.value.trim())
    parsedBackup.value = payload
    summary.value = summarizeBackup(payload)
    message.value = '备份已解密，请确认恢复方式。'
    showConfirm.value = true
  } catch (error) {
    message.value = error instanceof Error ? error.message : '解密失败：主密码或恢复码错误，无法读取备份数据！'
  } finally {
    busy.value = false
  }
}

async function restoreData() {
  if (!parsedBackup.value) return
  busy.value = true
  showConfirm.value = false
  message.value = ''
  try {
    await restoreBackup(parsedBackup.value, mode.value)
    emit('restored')
    message.value = '数据已成功恢复！应用即将自动刷新以加载最新配置。'
    window.setTimeout(() => window.location.reload(), 900)
  } catch (error) {
    message.value = error instanceof Error ? error.message : '恢复失败。'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/35 p-4" @click.self="emit('close')">
      <section class="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <header class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-stone-800">{{ props.initialAction === 'export' ? '导出 AES-256 加密备份' : '恢复加密备份数据' }}</h2>
            <p class="mt-1 text-xs text-stone-500">.mindbag 文件只在本机解密，不会上传云端。</p>
          </div>
          <button type="button" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" @click="emit('close')"><X :size="18" /></button>
        </header>

        <p v-if="message" class="mt-4 rounded-lg px-3 py-2 text-sm" :class="message.includes('成功') || message.includes('开始') || message.includes('保存') || message.includes('已解密') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'">{{ message }}</p>

        <section v-if="props.initialAction === 'export'" class="mt-5 rounded-xl border border-teal-100 bg-teal-50/40 p-5">
          <LockKeyhole :size="22" class="text-teal-700" />
          <h3 class="mt-3 text-sm font-semibold text-stone-800">导出全量加密备份</h3>
          <label class="mt-4 block text-sm font-medium text-stone-700">数据加密主密码<input v-model="exportPassword" type="password" autocomplete="current-password" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" placeholder="4 至 16 位主密码" /></label>
          <label class="mt-4 block text-sm font-medium text-stone-700">恢复码（可选）<input v-model="exportRecoveryCode" type="password" autocomplete="off" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" placeholder="输入恢复码以支持备用解密" /></label>
          <p class="mt-2 text-xs leading-5 text-stone-500">首次启动时设置的主密码会自动填入当前会话；如需让恢复码解密此备份，请在这里输入恢复码。</p>
          <button type="button" :disabled="busy" class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="exportData"><Download :size="16" />{{ busy ? '加密中…' : '导出 .mindbag' }}</button>
        </section>

        <section v-else class="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/30 p-5">
          <h3 class="text-lg font-bold text-slate-800">恢复加密备份数据</h3>
          <p class="mt-1 text-xs text-slate-500">.mindbag 文件将在本地直接解密，数据绝不上传云端。</p>

          <div v-if="!selectedFile" class="mt-5 cursor-pointer rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-8 text-center transition-all hover:border-emerald-500 hover:bg-emerald-50" @click="triggerFileInput">
            <div class="mb-2 text-3xl">📁</div>
            <div class="mb-1 text-sm font-bold text-slate-700">点击选择备份文件</div>
            <div class="text-xs text-slate-400">支持选取的 .mindbag 或 .json 备份文件</div>
            <input ref="fileInputRef" type="file" accept=".mindbag,.json" class="hidden" @change="onFileSelected" />
          </div>

          <div v-else class="mt-5 space-y-4">
            <div class="relative rounded-xl border border-slate-200 bg-slate-50 p-4">
              <button type="button" class="absolute right-2 top-2 text-xs text-slate-400 hover:text-red-500" @click="clearSelectedFile">重新选择</button>
              <div class="mb-2 flex items-center gap-1 text-xs font-bold text-emerald-700"><span>📄</span>{{ selectedFile.name }}</div>
              <div class="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>备份时间：{{ fileMeta.exportAt }}</div>
                <div>数据表：{{ fileMeta.tableCount }}</div>
                <div>学生：{{ fileMeta.studentCount }}</div>
                <div>咨询：{{ fileMeta.consultationCount }}</div>
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-bold text-slate-700">请输入解密主密码或 24 位恢复码</label>
              <input v-model="decryptPassword" type="password" autocomplete="off" placeholder="输入密码以解锁备份数据" class="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-emerald-500 focus:outline-none" />
            </div>

            <button type="button" :disabled="busy" class="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60" @click="startRestore"><span>🚀</span>{{ busy ? '正在解密…' : '开始解密并还原数据' }}</button>
          </div>
        </section>
      </section>
    </div>
  </Teleport>

  <RestoreConfirmModal v-if="showConfirm && summary" v-model:mode="mode" :summary="summary" @cancel="showConfirm = false" @confirm="restoreData" />
</template>
