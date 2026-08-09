<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getActivePinia } from 'pinia'
import FirstLaunchNoticeModal from './components/common/FirstLaunchNoticeModal.vue'
import OnboardingModal from './components/common/OnboardingModal.vue'
import SecuritySetupModal from './components/system/SecuritySetupModal.vue'
import BackupToastHost from './components/system/BackupToastHost.vue'
import { startReminderScheduler } from './services/reminderScheduler'
import { startAutoBackupScheduler } from './services/autoBackupScheduler'
import { isSecuritySetupComplete } from './services/securityService'

let stopScheduler: (() => void) | undefined
let stopAutoBackup: (() => void) | undefined
const securityReady = ref(isSecuritySetupComplete())
onMounted(() => { const pinia = getActivePinia(); if (pinia) { stopScheduler = startReminderScheduler(pinia); stopAutoBackup = startAutoBackupScheduler(pinia) } })
onBeforeUnmount(() => stopScheduler?.())
onBeforeUnmount(() => stopAutoBackup?.())
</script>

<template>
  <template v-if="securityReady">
    <RouterView />
    <FirstLaunchNoticeModal />
    <OnboardingModal />
  </template>
  <SecuritySetupModal v-else @completed="securityReady = true" />
  <BackupToastHost />
</template>
