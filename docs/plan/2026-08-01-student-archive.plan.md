# 阶段二：学生综合心理档案

| Field | Value |
|---|---|
| Status | Accepted |
| Owner | 心理老师工作台项目 |
| Created | 2026-08-01 |
| Related | 阶段二：学生综合心理档案模块 |

## Problem Statement

阶段一仅提供工作台外壳，需要完成学生列表、综合心理档案和服务履历的本地数据闭环。

## Proposal

通过 `studentService` 统一访问 `studentRepository`；Pinia 共享当前选中学生与刷新版本。`StudentList` 驱动筛选和选择，`StudentDetailView` 负责档案与编辑，`StudentTimeline` 呈现心理服务与成长履历。

## Data Handling

数据库首次为空时自动写入 8 条模拟学生和关联履历；写入系统标记，避免用户手动清空后自动回填。所有模拟记录可编辑或删除。

## Verification

- 学生页能显示、筛选、新增、选择和编辑本地档案。
- 预警等级会即时写入 IndexedDB。
- 生产构建通过。
