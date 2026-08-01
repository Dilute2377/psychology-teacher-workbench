# 心理老师工作台：阶段一基础架构规范

| Field | Value |
|---|---|
| Decision Status | Accepted |
| Implementation Status | Implemented |
| Last Updated | 2026-08-01 |
| Plan | [阶段一基础架构计划](../plan/2026-08-01-foundation.plan.md) |

## Summary

定义本地心理老师工作台的前端工程、核心业务类型、IndexedDB 表、界面状态层、基础路由和三栏式布局。

## Requirements

### Functional

- 应用使用 Vue 3、Vite、TypeScript、Tailwind CSS、Pinia 和 Dexie。
- 所有核心模型应从 `src/types/schema.ts` 导出。
- 本地数据库应包含学生、咨询、学期、普查、团辅、教学记录，以及时间轴与系统设置表。
- 工作台应提供顶部状态栏、左侧导航、中间列表槽位、右侧工作区槽位与路由出口。

### Non-Functional

- 应用不依赖远程服务才能启动。
- 此阶段不得写入真实敏感学生信息或伪装为已加密。

## Interfaces

- `src/db/index.ts` 导出单例 `db`。
- `src/stores/workbench.ts` 导出 `useWorkbenchStore`。
- `MainLayout` 提供 `list` 与 `workspace` 命名槽位。

## Edge Cases

- 未创建学期时，状态栏显示“请选择学期”。
- 未实施安全模块时，数据锁与备份入口只说明后续能力，不执行敏感操作。

## Test Plan

- 运行 `npm run build`，确认类型检查与生产构建均成功。
