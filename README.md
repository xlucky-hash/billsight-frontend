# Billsight · 多源账单管理与个人财务分析系统（前端）

面向个人用户的账单聚合与财务分析前端。支持 CSV / Excel 批量导入、支付截图 OCR 识别、三级智能分类（规则 → 贝叶斯 → 大模型兜底）、人工校对反哺、月度收支报表与账户管理。

> 智能应用开发比赛 · 赛题 B · 队伍：黎德锦、陈梦琪 · 报名序号：2

---

## 功能一览

| 模块 | 路由 | 说明 |
| --- | --- | --- |
| 登录 | `/login` | 账号登录，Token 持久化，路由守卫拦截未登录访问 |
| 财务概览 | `/dashboard` | 本月收支、结余、环比趋势、分类占比、最近账单 |
| 账单导入 | `/import` | 拖拽上传 CSV / Excel / 支付截图，展示导入批次与解析进度 |
| 账单校对 | `/transactions` | 分页筛选、低置信度高亮、逐条修改分类并标记纠错 |
| 报表分析 | `/reports` | 月度收支趋势、分类排行、导出报表 |
| 账户管理 | `/accounts` | 多账户增删改查与余额汇总 |
| 规则管理 | `/rules` | 用户级关键词规则维护，命中次数统计 |

## 技术栈

- **构建**：Vite 5 + TypeScript 5.6（`strict` 模式）
- **框架**：React 18 + React Router 6
- **UI**：Ant Design 5 + @ant-design/icons
- **状态**：Zustand 4（用户态、登录持久化）
- **请求**：Axios 统一封装，请求/响应拦截器
- **图表**：ECharts 5 + echarts-for-react
- **Mock**：MSW 2（Service Worker 拦截，前端可脱离后端独立演示）
- **规范**：ESLint 8 + Prettier 3

## 快速开始

环境要求：**Node.js ≥ 18**（推荐 20 LTS）

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（默认启用 Mock，无需后端）
npm run dev
# 打开 http://localhost:5173

# 3. 生产构建（产物输出到 dist/）
npm run build

# 4. 本地预览构建产物
npm run preview
```

登录页在 Mock 模式下任意账号密码均可进入，也可使用内置演示账号。

## 运行模式说明

前端支持两种数据来源，通过 `src/.env.development` 切换：

| 变量 | 含义 |
| --- | --- |
| `VITE_API_BASE_URL` | 接口基地址，默认 `/api` |
| `VITE_USE_MOCK` | `true` 启用 MSW 本地 Mock；`false` 走真实后端 |

**模式一：纯前端演示（默认）**

```env
VITE_API_BASE_URL=/api
VITE_USE_MOCK=true
```

无需数据库与后端服务，启动即完整可用，适合快速查看界面与交互。

**模式二：联调真实后端**

```env
VITE_API_BASE_URL=/api
VITE_USE_MOCK=false
```

同时需在 `vite.config.ts` 中配置代理，把 `/api` 转发到后端 8080 端口：

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
}
```

后端仓库：[billsight-backend](https://github.com/xlucky-hash/billsight-backend)（构建与启动方式见其 README）

## 目录结构

```
src/
├── api/          # 接口封装，按业务域拆分（auth/files/transactions/reports/rules/...）
├── components/   # 通用组件
├── layouts/      # BasicLayout 主框架（侧边导航 + 页头）
├── mocks/        # MSW 手写 Mock：handlers.ts 路由 + data.ts 演示数据
├── pages/        # 页面：dashboard/import/transactions/reports/accounts/rules/login
├── router/       # 路由表与登录守卫（RequireAuth / GuestOnly）
├── store/        # Zustand 状态：用户态与登录持久化
├── styles/       # 全局样式与主题变量
├── types/        # TypeScript 类型定义
└── utils/        # 请求实例、格式化等工具
```

## 已实现能力与边界

**已实现**

- 七个页面的完整界面与交互流程
- 登录态持久化与路由级访问控制
- 导入批次状态展示、账单分页筛选、分类修改与纠错标记
- 报表图表渲染与导出交互
- MSW 全链路 Mock，前端可独立演示完整业务闭环

**已知限制（后续迭代项）**

1. **产物未分包**：当前为单包 `2.44 MB`（gzip 794 KB），未做 `manualChunks` 或路由懒加载，首屏体积偏大。
2. **生产环境未接真实接口**：生产构建默认未启用 Mock，也未配置代理，需部署时由 Nginx 反向代理 `/api`。
3. **轮询无退避**：导入进度采用固定间隔轮询，缺少超时上限与指数退避。
4. **Token 存储**：当前存于 `localStorage`，存在 XSS 读取风险，后续迁移至 HttpOnly Cookie。
5. **缺少 ErrorBoundary**：单个组件异常可能导致整页白屏。
6. **报表 TOP8 为前端截取**：分类排行取前 200 条在浏览器端排序截断，数据量增大后应下沉到服务端聚合。
7. **无自动化测试**：尚未接入 Vitest / Playwright。
8. **`PageContainer` 未被引用**：布局组件存在但页面未统一使用，页头样式仍为各页自行实现。

## 相关文档

技术文档（需求分析、原型设计、数据库设计、接口设计、初步验证）随比赛材料提交，其中「初步验证」章节记录了本项目的构建结果、接口联调情况与上述限制项。
