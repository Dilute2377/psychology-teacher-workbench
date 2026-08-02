<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { LockKeyhole } from '@lucide/vue'
import { useAppLockStore } from '../../stores/useAppLockStore'
import { focusModalField } from '../../utils/focusModalField'

const appLock = useAppLockStore(); const pin = ref(''); const confirmPin = ref(''); const error = ref(''); const saving = ref(false)
async function submit() { saving.value = true; error.value = ''; try { if (!appLock.isConfigured) { if (pin.value !== confirmPin.value) throw new Error('两次 PIN 输入不一致。'); await appLock.setPin(pin.value) } else if (!await appLock.verify(pin.value)) throw new Error('PIN 不正确。'); appLock.unlock(); pin.value = ''; confirmPin.value = '' } catch (reason) { error.value = reason instanceof Error ? reason.message : '操作失败。' } finally { saving.value = false } }
onMounted(async () => { await appLock.load(); await focusModalField() })
</script>

<template><Teleport to="body"><div class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950 p-6 text-white"><section class="w-full max-w-sm text-center"><span class="mx-auto flex size-16 items-center justify-center rounded-3xl bg-teal-500/20 text-teal-300"><LockKeyhole :size="30" /></span><h1 class="mt-5 text-xl font-semibold">心理老师工作台已锁定</h1><p class="mt-2 text-sm leading-6 text-slate-400">{{ appLock.isConfigured ? '请输入本机 PIN 码以恢复当前工作上下文。' : '首次使用，请设置 4 至 6 位数字 PIN。' }}</p><div class="mt-6 space-y-3"><input v-model="pin" inputmode="numeric" maxlength="6" type="password" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-lg tracking-[0.5em] outline-none focus:border-teal-400" placeholder="PIN" @keyup.enter="submit" /><input v-if="!appLock.isConfigured" v-model="confirmPin" inputmode="numeric" maxlength="6" type="password" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-lg tracking-[0.5em] outline-none focus:border-teal-400" placeholder="确认 PIN" @keyup.enter="submit" /></div><p v-if="error" class="mt-3 text-sm text-rose-300">{{ error }}</p><button type="button" :disabled="saving" class="mt-5 w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold hover:bg-teal-500 disabled:opacity-50" @click="submit">{{ saving ? '验证中…' : appLock.isConfigured ? '解锁系统' : '设置并解锁' }}</button></section></div></Teleport></template>
