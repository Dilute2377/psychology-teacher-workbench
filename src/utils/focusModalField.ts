import { nextTick } from 'vue'

/** 每次弹窗重新挂载后把焦点落到第一个可编辑控件，避免上一个 Teleport 实例残留焦点。 */
export async function focusModalField() {
  await nextTick()
  window.setTimeout(() => {
    const overlays = [...document.querySelectorAll<HTMLElement>('.fixed.inset-0')]
    const overlay = overlays.at(-1)
    const field = overlay?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input:not([type="file"]), select, textarea')
    field?.focus({ preventScroll: true })
  }, 0)
}
