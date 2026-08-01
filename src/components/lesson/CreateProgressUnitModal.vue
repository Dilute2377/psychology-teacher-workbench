<script setup lang="ts">
import ProgressUnitModal from './ProgressUnitModal.vue'

defineProps<{ initialPlanId?: string; grades: string[] }>()
const emit = defineEmits<{ close: []; saved: [] }>()
</script>

<template>
  <ProgressUnitModal
    :initial-plan-id="initialPlanId"
    :grades="grades"
    @close="emit('close')"
    @saved="emit('saved')"
  />
</template>
