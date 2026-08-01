<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { X } from '@lucide/vue'
import { useTeachingStore } from '../../stores/useTeachingStore'
import { useSchoolConfigStore } from '../../stores/useSchoolConfigStore'
import type { TeachingMaterial } from '../../types/schema'

const props = defineProps<{ editingId?: string | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const teachingStore = useTeachingStore(); const schoolConfig = useSchoolConfigStore(); const saving = ref(false)
const form = reactive({ type: 'activity' as TeachingMaterial['type'], title: '', description: '', resourceNote: '', gradeTarget: '', tagsText: '', attachment: undefined as TeachingMaterial['attachment'] })
const types: Array<{ value: TeachingMaterial['type']; label: string }> = [{ value: 'video', label: '🎬 心理短片与视频' }, { value: 'activity', label: '💡 破冰与互动游戏' }, { value: 'case', label: '🖼️ 案例与图解素材' }, { value: 'survey', label: '📊 课堂小测量与问卷' }, { value: 'reference', label: '📂 参考 PPT 与讲义' }]
onMounted(async () => { await schoolConfig.load(); const material = props.editingId ? teachingStore.teachingMaterials.find((item) => item.id === props.editingId) : undefined; if (material) Object.assign(form, { ...material, tagsText: material.tags?.join('，') ?? '' }) })
async function attachFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 8 * 1024 * 1024) { alert('为保证本地工作台顺畅，请选择 8MB 以内的素材文件。'); return }
  form.attachment = { name: file.name, type: file.type || 'application/octet-stream', dataUrl: await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file) }) }
}
async function save() {
  if (!form.title.trim()) { window.alert('请填写素材名称。'); return }
  saving.value = true
  try {
    const draft = {
      type: form.type,
      title: form.title,
      description: form.description,
      resourceNote: form.resourceNote,
      gradeTarget: form.gradeTarget,
      // Dexie 不能直接保存 Vue 响应式代理对象，附件必须先转换为普通对象。
      attachment: form.attachment ? { ...form.attachment } : undefined,
      tags: form.tagsText.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean),
    }
    if (props.editingId) await teachingStore.updateTeachingMaterial(props.editingId, draft)
    else await teachingStore.addTeachingMaterial(draft)
    emit('saved'); emit('close')
  } catch (error) {
    window.alert(error instanceof Error ? `保存素材失败：${error.message}` : '保存素材失败，请稍后重试。')
  } finally { saving.value = false }
}
</script>

<template><Teleport to="body"><div class="fixed inset-0 z-50 bg-stone-950/30" @click.self="emit('close')"><section class="ml-auto flex h-full w-full max-w-xl flex-col bg-white p-6 shadow-2xl"><header class="flex items-start justify-between"><div><h2 class="text-lg font-semibold text-stone-800">{{ editingId ? '编辑备课素材' : '新增备课素材' }}</h2><p class="mt-1 text-sm text-stone-500">这里仅管理零散教学资源；完整教案请在左侧教案库撰写。</p></div><button class="rounded-lg p-2 text-stone-400 hover:bg-stone-100" @click="emit('close')"><X :size="18" /></button></header><div class="mt-6 flex-1 space-y-4 overflow-y-auto"><label class="block text-sm font-medium text-stone-700">素材类别<select v-model="form.type" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2"><option v-for="type in types" :key="type.value" :value="type.value">{{ type.label }}</option></select></label><label class="block text-sm font-medium text-stone-700">名称<input v-model="form.title" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" placeholder="如：三分钟呼吸放松视频" /></label><label class="block text-sm font-medium text-stone-700">适用年级<select v-model="form.gradeTarget" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2"><option value="">全学段通用</option><option v-for="grade in schoolConfig.enabledGrades" :key="grade">{{ grade }}</option></select></label><label class="block text-sm font-medium text-stone-700">标签（逗号分隔）<input v-model="form.tagsText" class="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2" placeholder="如：情绪调节、初一、视频" /></label><label class="block text-sm font-medium text-stone-700">内容简介<textarea v-model="form.description" rows="4" class="mt-1.5 w-full rounded-lg border border-stone-200 p-3 leading-6" placeholder="说明素材适用情境和使用建议。" /></label><label class="block text-sm font-medium text-stone-700">资源备注 / 链接说明<textarea v-model="form.resourceNote" rows="3" class="mt-1.5 w-full rounded-lg border border-stone-200 p-3 leading-6" placeholder="粘贴链接、写明本地文件位置或 PPT 页码。" /></label><div class="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3"><label class="inline-flex cursor-pointer items-center rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-teal-300 hover:text-teal-700">上传本地文件<input class="hidden" type="file" @change="attachFile" /></label><p class="mt-2 text-xs text-stone-400">{{ form.attachment ? `已附加：${form.attachment.name}` : '支持本地离线保存，单个文件不超过 8MB。' }}</p></div></div><footer class="mt-6 flex justify-end gap-2 border-t border-stone-100 pt-5"><button class="rounded-lg px-4 py-2 text-sm text-stone-600 hover:bg-stone-100" @click="emit('close')">取消</button><button :disabled="saving" class="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="save">{{ saving ? '保存中…' : '保存素材' }}</button></footer></section></div></Teleport></template>
