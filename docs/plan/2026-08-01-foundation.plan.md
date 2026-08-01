# 心理老师工作台：阶段一基础架构

| Field | Value |
|---|---|
| Status | Accepted |
| Owner | 心理老师工作台项目 |
| Created | 2026-08-01 |
| Related | 阶段一：基础架构与全局 UI 骨架 |

## Problem Statement

为中学心理教师提供一个纯本地、可离线运行、可逐步扩展的工作台基础工程。

## Goals

- 使用 Vue 3、Vite、TypeScript、Tailwind CSS、Pinia 和 Dexie。
- 建立完整核心数据契约和 IndexedDB 表定义。
- 交付带路由、导航、列表槽位、工作区槽位和全局模态框的三栏布局。

## Non-Goals

- 本阶段不录入真实学生数据，不实现账户、密码或加密。
- 本阶段不实现 PDF、Excel、备份包或业务表单。

## Proposal

业务类型位于 `src/types/schema.ts`；所有 IndexedDB 访问集中在 `src/db`；Pinia 仅承担界面状态；页面通过路由进入统一 `MainLayout`。

## Milestones

| Milestone | Description | Target |
|---|---|---|
| M1 | 工程、类型、数据库与主工作台 | 完成 |
| M2 | 学生档案与 360° 视图 | 后续阶段 |
| M3 | 安全与加密导入导出 | 后续阶段 |

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 未加密即保存敏感数据 | 中 | 高 | 阶段一不录入真实档案；第五阶段接入经审查的加密方案。 |
| 模块直接读写数据库 | 中 | 中 | 后续业务统一经数据服务层访问。 |

## Alternatives Considered

- React + Vite：生态完整，但与已确认的 Vue 方案不一致。
- 云端数据库：不满足零云端、离线安全的核心约束。
