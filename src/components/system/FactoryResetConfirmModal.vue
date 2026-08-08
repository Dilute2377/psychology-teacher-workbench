<script setup lang="ts">
import { ref } from 'vue'
import { AlertTriangle, X } from '@lucide/vue'

defineProps<{ busy?: boolean }>()
const emit = defineEmits<{ cancel: []; confirm: [] }>()
const phrase = ref('')
</script>

<template><Teleport to="body"><div class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/65 p-4"><section class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><header class="flex items-start justify-between gap-3"><div class="flex items-center gap-3"><span class="flex size-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700"><AlertTriangle :size="20" /></span><div><h2 class="text-lg font-semibold text-slate-800">恢复出厂设置</h2><p class="mt-1 text-xs text-slate-500">此操作会清空本机所有业务数据，且无法撤销。</p></div></div><button type="button" class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" @click="emit('cancel')"><X :size="18" /></button></header><div class="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">将清空学生、咨询、普查、团辅、课程、留痕、附件和设置数据。建议先导出加密备份。</div><label class="mt-5 block text-sm font-medium text-slate-700">请输入 <b class="font-mono text-rose-700">RESET</b> 继续<input v-model="phrase" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono outline-none focus:border-rose-500" autocomplete="off" /></label><div class="mt-6 flex justify-end gap-2"><button type="button" class="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" @click="emit('cancel')">取消</button><button type="button" :disabled="busy || phrase !== 'RESET'" class="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40" @click="emit('confirm')">{{ busy ? '清空中…' : '确认恢复出厂' }}</button></div></section></div></Teleport></template>
