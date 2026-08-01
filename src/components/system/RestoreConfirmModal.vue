<script setup lang="ts">
import type { BackupSummary } from '../../services/backupService'

defineProps<{ summary: BackupSummary }>()
const mode = defineModel<'replace' | 'merge'>('mode', { required: true })
const emit = defineEmits<{ cancel: []; confirm: [] }>()
</script>

<template><Teleport to="body"><div class="fixed inset-0 z-[60] flex items-center justify-center bg-stone-950/40 p-4"><section class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 class="text-lg font-semibold text-stone-800">确认恢复备份</h2><p class="mt-2 text-sm text-stone-500">备份生成于 {{ summary.exportAt }}，包含 {{ summary.students }} 名学生、{{ summary.consultations }} 条咨询、{{ summary.workTrails }} 条留痕和 {{ summary.attachments }} 个附件。</p><div class="mt-5 space-y-3 text-sm"><label class="flex gap-2 rounded-lg border p-3" :class="mode === 'replace' ? 'border-emerald-400 bg-emerald-50' : 'border-stone-200'"><input v-model="mode" value="replace" type="radio" /> <span><b>覆盖恢复（推荐）</b><small class="mt-1 block text-stone-500">清空本机数据，完整还原备份。</small></span></label><label class="flex gap-2 rounded-lg border p-3" :class="mode === 'merge' ? 'border-emerald-400 bg-emerald-50' : 'border-stone-200'"><input v-model="mode" value="merge" type="radio" /> <span><b>合并恢复</b><small class="mt-1 block text-stone-500">按记录 ID 去重追加，保留本机已有数据。</small></span></label></div><div class="mt-6 flex justify-end gap-2"><button type="button" class="rounded-lg px-3 py-2 text-sm text-stone-600" @click="emit('cancel')">取消</button><button type="button" class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white" @click="emit('confirm')">确认恢复</button></div></section></div></Teleport></template>
