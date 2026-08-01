<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { getActivePinia } from 'pinia'
import FirstLaunchNoticeModal from './components/common/FirstLaunchNoticeModal.vue'
import { startReminderScheduler } from './services/reminderScheduler'

let stopScheduler: (() => void) | undefined
onMounted(() => { const pinia = getActivePinia(); if (pinia) stopScheduler = startReminderScheduler(pinia) })
onBeforeUnmount(() => stopScheduler?.())
</script>

<template>
  <RouterView />
  <FirstLaunchNoticeModal />
</template>
