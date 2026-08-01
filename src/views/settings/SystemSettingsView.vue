<script setup lang="ts">
import { ref } from 'vue'
import { Download, LockKeyhole, Upload } from '@lucide/vue'
import BackupRestoreModal from '../../components/system/BackupRestoreModal.vue'
import { useAppLockStore } from '../../stores/useAppLockStore'

const appLock = useAppLockStore()
const showBackup = ref(false)
</script>

<template>
  <div class="h-full overflow-y-auto bg-slate-50 p-6">
    <div class="mx-auto max-w-4xl">
      <p class="text-sm font-medium text-teal-700">系统设置</p>
      <h1 class="mt-1 text-2xl font-semibold text-stone-800">本地数据与隐私</h1>
      <p class="mt-2 text-sm leading-6 text-stone-500">所有数据只保存在当前浏览器设备。请定期导出加密备份，并妥善保管数据锁 PIN。</p>
      <section class="mt-6 grid gap-4 md:grid-cols-2">
        <article class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div class="flex items-center gap-2 text-stone-800"><LockKeyhole :size="18" class="text-teal-700" /><h2 class="font-semibold">数据锁</h2></div><p class="mt-3 text-sm leading-6 text-stone-500">{{ appLock.isConfigured ? '已设置本机 PIN。可从顶部“数据锁”立即锁屏。' : '尚未设置 PIN。请先点击顶部“数据锁”完成首次设置。' }}</p></article>
        <article class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"><div class="flex items-center gap-2 text-stone-800"><Download :size="18" class="text-teal-700" /><h2 class="font-semibold">备份与恢复</h2></div><p class="mt-3 text-sm leading-6 text-stone-500">导出或恢复加密的 .mindbag 文件；可选择合并或覆盖本机数据。</p><button type="button" class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800" @click="showBackup = true"><Upload :size="16" />从备份文件恢复 / 导出</button></article>
      </section>
    </div>
    <BackupRestoreModal v-if="showBackup" @close="showBackup = false" @restored="showBackup = false" />
  </div>
</template>
