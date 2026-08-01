<script setup lang="ts">
import ConsultationDetailModal from './ConsultationDetailModal.vue'
import type { ConsultationRecord, RiskLevel } from '../../types/schema'

defineProps<{ record: ConsultationRecord; studentName?: string; riskLevelAtTime?: RiskLevel }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template><ConsultationDetailModal :record="record" :student-name="studentName" :risk-level-at-time="riskLevelAtTime" @close="emit('close')" /></template>
