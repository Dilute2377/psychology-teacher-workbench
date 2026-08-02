# 心理老师工作台

面向学校心理教师的纯本地工作台：学生档案、个体咨询、心理普查、团体辅导、教学记录、工作留痕、备份恢复与可选飞书提醒均保存在浏览器本机。

> 本项目不附带任何学生、咨询、普查或工作留痕示例数据。首次使用请先完成学校与学期配置，再导入或新增真实业务数据。

## 下载桌面版（推荐）

不需要安装 Node.js，也不需要打开命令行。请前往 [Release 下载页](https://github.com/Dilute2377/psychology-teacher-workbench/releases/latest) 选择 Windows EXE：

- **安装版**：`Psychology-Teacher-Workbench-Setup-v1.0.3.exe`。适合日常固定在一台电脑上使用，会创建桌面和开始菜单入口。
- **便携版**：`Psychology-Teacher-Workbench-Portable-v1.0.3.exe`。无需安装，可放在 U 盘携带；请同时定期导出 `.mindbag` 备份。

## 开始使用

```bash
npm install
npm run dev
```

浏览器打开终端给出的本地地址。生产构建：

```bash
npm run build
```

## 第一次使用

1. 阅读首次启动的免费公益声明。
2. 进入“系统设置 → 学校与教学配置”，选择学校学段、设置年级班级数与作息。
3. 在“系统设置 → 学期与升学”中新增当前学期，并设为当前学期。
4. 进入“学生档案”，通过“导入”导入学生名单，或手工新建学生。
5. 从学生档案、个体咨询、心理普查、团体辅导、教学记录开始日常工作。

## 完整使用说明

请阅读 [完整使用说明书](./docs/USER_GUIDE.md)：包含每个模块的用途、操作步骤、数据联动、备份与恢复、飞书提醒及常见问题。

## 数据与隐私

- 业务数据默认只保存在当前设备。网页版本使用浏览器 IndexedDB；桌面版使用应用本地数据目录。清理浏览器网站数据、换电脑或换浏览器前，请先导出 `.mindbag` 备份。
- 飞书提醒是可选功能。未启用或未填写 Webhook 时，应用不会向飞书发送请求。
- `.mindbag` 会包含业务数据及本机设置，可能包含飞书 Webhook、附件等敏感内容，请离线妥善保管。

## 技术栈

Vue 3 · Vite · TypeScript · Tailwind CSS · Pinia · Dexie / IndexedDB · SheetJS (`xlsx`)

## 项目结构

```text
src/
├─ components/   # 业务组件、表单、抽屉与弹窗
├─ db/           # Dexie 数据库定义
├─ services/     # 备份、飞书、提醒、学生服务
├─ stores/       # Pinia 响应式状态
├─ views/        # 各业务工作区
└─ utils/        # 年级、量表解析等工具
```
