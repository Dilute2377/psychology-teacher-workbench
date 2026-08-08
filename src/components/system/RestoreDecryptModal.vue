<script setup lang="ts">
import { ref } from 'vue'
import { LockKeyhole, X } from '@lucide/vue'
import { decryptBackupFile, type BackupPayload } from '../../services/backupService'

const props = defineProps<{ encryptedPayload: string }>()
const emit = defineEmits<{ cancel: []; decrypted: [payload: BackupPayload] }>()
const password = ref('')
const error = ref('')
const busy = ref(false)
async function decrypt() {
  error.value = ''
  if (!password.value.trim()) { error.value = '请输入主密码或 24 位恢复码。'; return }
  busy.value = true
  try { emit('decrypted', await decryptBackupFile(props.encryptedPayload, password.value.trim())) } catch (reason) { error.value = reason instanceof Error ? reason.message : '解密失败：主密码或恢复码错误，无法读取备份数据！' } finally { busy.value = false }
}
</script>

<template><Teleport to="body"><div class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4"><section class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><header class="flex items-start justify-between gap-4"><div class="flex items-center gap-2"><span class="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><LockKeyhole :size="18" /></span><div><h2 class="text-lg font-semibold text-slate-800">解密备份文件</h2><p class="mt-1 text-xs text-slate-500">请输入数据解密主密码或 24 位恢复码。</p></div></div><button type="button" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" @click="emit('cancel')"><X :size="18" /></button></header><label class="mt-6 block text-sm font-medium text-slate-700">解密密码或恢复码<input v-model="password" type="password" autocomplete="off" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500" @keyup.enter="decrypt" /></label><p v-if="error" class="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">❌ {{ error }}</p><div class="mt-6 flex justify-end gap-2"><button type="button" class="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" @click="emit('cancel')">取消</button><button type="button" :disabled="busy" class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="decrypt">{{ busy ? '解密中…' : '解密并读取' }}</button></div></section></div></Teleport></template>
