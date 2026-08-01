# 心理老师工作台桌面版发布设计

## 目标

为不熟悉技术操作的心理老师提供无需 Node.js 与浏览器的 Windows 桌面应用，并在同一 GitHub Release 中交付安装版与便携版。

## 发布形态

- **安装版**：采用 NSIS 安装程序，为当前 Windows 用户安装，创建桌面及开始菜单入口，支持卸载。
- **便携版**：单个免安装 EXE，可置于 U 盘携带运行。

## 技术方案

现有 Vue + Vite 应用以 Electron 主进程承载。渲染进程沿用当前页面、Dexie/IndexedDB 数据模型及 Pinia 状态；生产环境从打包后的 Vite 静态文件加载。

构建由 electron-builder 统一产出：

1. 先执行现有 TypeScript 与 Vite 生产构建。
2. 构建 Windows NSIS 安装器。
3. 构建 Windows portable 便携程序。
4. 将两个 EXE 上传至 GitHub Release `v1.0.0`。

## 数据与安全边界

- 发布包不包含 IndexedDB、localStorage、模拟学生或测试业务记录。
- 安装版和便携版均从空数据首次启动，使用者自行配置学校、学期和真实学生数据。
- 用户可通过应用内 `.mindbag` 备份与恢复迁移业务数据。

## 验收

- `npm run build` 通过。
- `npm run package:win` 同时生成安装版与便携版 EXE。
- 两个 EXE 均出现在公开 GitHub Release。
- README 明确区分两个版本并链接至 Release 下载页。
