# Storage Boundary、Beta 测试与发布优化设计

## 目标

在保持现有 IndexedDB 数据结构和离线使用方式不变的前提下，降低大附件进入渲染进程后的内存风险，补充软件使用边界与一线教师测试材料，并让 Electron 发布包使用 ASAR 和最高压缩。

## 设计决策

1. 所有会把文件转成 data URL 的入口统一调用 `src/services/storageBoundary.ts`。
2. 图片先通过 `ImageBitmap + Canvas` 缩放到最长边 2048px、JPEG 质量 0.82；压缩结果不划算时回退原文件。
3. 音频/视频及其他内嵌附件默认上限 30MB；超限直接阻止并提示优先记录本地路径引用。备课素材维持 8MB 上限。
4. 既有附件不自动重编码、不自动删除，边界只作用于新上传文件。
5. 首次启动和“关于系统”同时展示教学辅助工具、专业临床判断和加密备份保管责任提示。
6. Beta 只提供招募文案、7 天任务和脱敏反馈模板，不代替维护者向外部平台发布或接收个案材料。
7. Electron 使用 ASAR、`compression: maximum`、关闭无原生依赖的 npm rebuild，并继续输出 NSIS 与 portable 两个目标。

## 验证

- `npm run build`
- `git diff --check`
- `npm run package:win`
- 检查安装版与便携版体积是否保持在约 80–120MB 区间。
