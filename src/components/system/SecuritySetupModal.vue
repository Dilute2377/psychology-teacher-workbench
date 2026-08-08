<script setup lang="ts">
import { computed, ref } from 'vue'
import { LockKeyhole, ShieldCheck } from '@lucide/vue'
import { completeSecuritySetup } from '../../services/securityService'

const emit = defineEmits<{ completed: [] }>()
const step = ref<1 | 2>(1)
const password = ref('')
const confirmPassword = ref('')
const recoveryCode = ref('')
const message = ref('')
const saving = ref(false)
const copied = ref(false)
const canContinue = computed(() => password.value.length >= 4 && password.value.length <= 16 && password.value === confirmPassword.value)

async function continueSetup() {
  message.value = ''
  if (!canContinue.value) { message.value = '请设置 4 至 16 位主密码，并确保两次输入一致。'; return }
  saving.value = true
  try { recoveryCode.value = await completeSecuritySetup(password.value); step.value = 2 } catch (error) { message.value = error instanceof Error ? error.message : '安全设置失败。' } finally { saving.value = false }
}
async function copyRecoveryCode() {
  try { await navigator.clipboard.writeText(recoveryCode.value); copied.value = true; window.setTimeout(() => { copied.value = false }, 1600) } catch { message.value = '复制失败，请手动抄写恢复码。' }
}
function finish() { emit('completed') }
</script>

<template><Teleport to="body"><div class="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/75 p-4"><section class="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"><header class="flex items-center gap-3 bg-slate-900 px-6 py-5 text-white"><span class="flex size-10 items-center justify-center rounded-xl bg-emerald-500"><ShieldCheck :size="21" /></span><div><h1 class="font-semibold">首次启动安全设置</h1><p class="mt-1 text-xs text-slate-300">心理档案数据仅保存在本机，主密码不会上传。</p></div></header><div class="p-6"><div class="flex items-center gap-2 text-xs font-semibold text-slate-400"><span :class="step >= 1 ? 'text-emerald-700' : ''">1 设置主密码</span><span>→</span><span :class="step >= 2 ? 'text-emerald-700' : ''">2 保存恢复码</span></div><div v-if="step === 1" class="mt-6"><div class="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm leading-6 text-emerald-900"><LockKeyhole :size="18" class="mr-1 inline" />请设置一个 4 至 16 位数据加密主密码，用于加密导出和恢复备份。</div><label class="mt-5 block text-sm font-medium text-slate-700">数据加密主密码<input v-model="password" type="password" minlength="4" maxlength="16" autocomplete="new-password" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500" /></label><label class="mt-4 block text-sm font-medium text-slate-700">再次确认密码<input v-model="confirmPassword" type="password" minlength="4" maxlength="16" autocomplete="new-password" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500" /></label><p v-if="message" class="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{{ message }}</p><button type="button" :disabled="saving" class="mt-6 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" @click="continueSetup">{{ saving ? '生成安全配置中…' : '继续生成恢复码' }}</button></div><div v-else class="mt-6"><div class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-900">⚠️ 此解密恢复码仅显示一次！请复制或抄写备份。这是数据解密与恢复的唯一凭证！</div><p class="mt-5 text-xs text-slate-500">恢复码可在忘记主密码时尝试解密备份，请不要发送给他人。</p><div class="mt-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center font-mono text-xl font-bold tracking-[0.18em] text-slate-800">{{ recoveryCode }}</div><div class="mt-4 flex gap-2"><button type="button" class="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="copyRecoveryCode">{{ copied ? '已复制恢复码' : '复制恢复码' }}</button><button type="button" class="flex-1 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800" @click="finish">我已妥善保存，开启工作台</button></div></div></div></section></div></Teleport></template>
