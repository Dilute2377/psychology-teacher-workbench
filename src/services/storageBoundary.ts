/**
 * IndexedDB 附件边界：避免把未经处理的大型 Blob 转成 Base64 后长期占用渲染进程内存。
 * 目前附件仍按项目既有协议保存为 data URL；本服务只负责进入数据库前的大小校验和图片压缩。
 */

export const MAX_INLINE_ATTACHMENT_BYTES = 30 * 1024 * 1024
export const MAX_TEACHING_MATERIAL_BYTES = 8 * 1024 * 1024
const MAX_IMAGE_EDGE = 2048
const IMAGE_QUALITY = 0.82

export type InlineAttachmentKind = 'image' | 'audio' | 'video' | 'file'

export interface PreparedInlineAttachment {
  dataUrl: string
  kind: InlineAttachmentKind
  sizeLabel: string
  originalBytes: number
  storedBytes: number
  compressed: boolean
}

export class StorageBoundaryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StorageBoundaryError'
  }
}

function extensionOf(file: File) {
  return file.name.split('.').pop()?.toLowerCase() ?? ''
}

function kindOf(file: File): InlineAttachmentKind {
  if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extensionOf(file))) return 'image'
  if (file.type.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm'].includes(extensionOf(file))) return 'audio'
  if (file.type.startsWith('video/') || ['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm'].includes(extensionOf(file))) return 'video'
  return 'file'
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${bytes} B`
}

function readAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new StorageBoundaryError('附件读取失败。'))
    reader.readAsDataURL(file)
  })
}

async function compressImage(file: File) {
  if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined') return { dataUrl: await readAsDataUrl(file), compressed: false }

  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return { dataUrl: await readAsDataUrl(file), compressed: false }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const compressed = canvas.toDataURL('image/jpeg', IMAGE_QUALITY)
    // data URL 约比原始二进制大 33%；若压缩结果反而更大，再回退到原文件。
    if (compressed.length * 0.75 >= file.size * 0.98) return { dataUrl: await readAsDataUrl(file), compressed: false }
    return { dataUrl: compressed, compressed: true }
  } catch {
    return { dataUrl: await readAsDataUrl(file), compressed: false }
  } finally {
    bitmap?.close()
  }
}

export async function prepareInlineAttachment(file: File, options: { maxBytes?: number; compressImages?: boolean } = {}): Promise<PreparedInlineAttachment> {
  const kind = kindOf(file)
  const maxBytes = options.maxBytes ?? MAX_INLINE_ATTACHMENT_BYTES
  if ((kind === 'audio' || kind === 'video') && file.size > maxBytes) {
    throw new StorageBoundaryError(`音频/视频文件“${file.name}”为 ${formatBytes(file.size)}，超过 ${formatBytes(maxBytes)} 限制。建议保留本地路径引用，不要直接嵌入工作台。`)
  }
  if (file.size > maxBytes) throw new StorageBoundaryError(`附件“${file.name}”为 ${formatBytes(file.size)}，超过 ${formatBytes(maxBytes)} 限制，请压缩后再添加。`)

  const imageResult = kind === 'image' && options.compressImages !== false
    ? await compressImage(file)
    : { dataUrl: await readAsDataUrl(file), compressed: false }
  const storedBytes = Math.max(1, Math.round(imageResult.dataUrl.length * 0.75))
  return {
    dataUrl: imageResult.dataUrl,
    kind,
    sizeLabel: `${formatBytes(storedBytes)}${imageResult.compressed ? '（已压缩）' : ''}`,
    originalBytes: file.size,
    storedBytes,
    compressed: imageResult.compressed,
  }
}
