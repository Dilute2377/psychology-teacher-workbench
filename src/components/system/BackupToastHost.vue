<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const message = ref('')
const tone = ref<'success' | 'error' | 'info'>('info')
let timer: number | undefined
function show(event: Event) {
  const detail = (event as CustomEvent<{ message?: string; tone?: 'success' | 'error' | 'info' }>).detail
  message.value = detail?.message ?? ''
  tone.value = detail?.tone ?? 'info'
  if (timer) window.clearTimeout(timer)
  timer = window.setTimeout(() => { message.value = '' }, 5000)
}
onMounted(() => window.addEventListener('backup-toast', show))
onBeforeUnmount(() => { window.removeEventListener('backup-toast', show); if (timer) window.clearTimeout(timer) })
</script>

<template><Teleport to="body"><Transition name="toast"><div v-if="message" class="fixed bottom-5 right-5 z-[140] max-w-sm rounded-xl border px-4 py-3 text-xs font-medium shadow-xl" :class="tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-sky-200 bg-sky-50 text-sky-800'">{{ message }}</div></Transition></Teleport></template>
<style scoped>.toast-enter-active,.toast-leave-active{transition:all .2s ease}.toast-enter-from,.toast-leave-to{opacity:0;transform:translateY(8px)}</style>
