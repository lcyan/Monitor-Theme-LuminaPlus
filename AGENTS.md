# Repository Guidelines

## 项目结构与模块组织

本仓库是 monitor 的 LuminaPlus 公开状态主题，使用 React 19、TypeScript、Vite 和 Tailwind CSS 4。

- `src/pages/`：路由页面；`src/components/`：按节点、实例、页面框架等领域组织的组件。
- `src/hooks/`：共享 Hooks；`src/services/`：HTTP API、WebSocket 和查询状态；`src/utils/`：计算与格式化逻辑；`src/types/`：数据模型与校验。
- `src/styles/`：全局及组件样式；`public/`：静态资源；`docs/images/`：文档与主题预览图。
- 测试放在对应模块的 `__tests__/`；`scripts/` 负责预览图同步和主题打包；`theme.json` 定义主题元数据。

## 构建、测试与本地开发

使用 Node.js 22（与发布工作流一致），运行 `npm ci` 安装锁定依赖。

- `npm run dev`：启动开发服务器，将 `/api` 和 WebSocket 代理到 `http://127.0.0.1:9911` 的 monitor hub。无后端时，可在开发页面添加 `?mock=1` 使用模拟数据。
- `npm run typecheck`：执行 TypeScript 项目类型检查。
- `npm run lint`：执行 ESLint 检查。
- `npm test` / `npm run test:watch`：运行全部测试或进入监听模式。
- `npm run build`：类型检查并生成 `dist/`；`npm run preview`：预览构建产物。
- `npm run package`：构建、同步预览图并生成 `theme.tar.gz`，需要系统提供 `tar`。

## 代码风格与命名

遵循现有代码：两空格缩进、双引号、分号和多行尾逗号。启用 TypeScript 严格检查；类型导入使用 `import type`，跨模块路径可使用 `@/` 别名。

组件与页面使用 PascalCase，例如 `NodeListView.tsx`；Hooks 使用 `useXxx`；工具模块使用 camelCase，例如 `trafficStats.ts`。ESLint 包含 TypeScript 与 React Hooks 规则；仓库没有独立的 Prettier 配置。保持改动聚焦，避免顺带重构。

## 测试规范

使用 Vitest，文件命名为 `__tests__/<模块名>.test.ts`，通过 `describe` 和 `it` 描述行为。单文件示例：`npm test -- src/utils/__tests__/trafficStats.test.ts`。

修复逻辑缺陷时补充能复现问题的回归测试，重点覆盖 API 兼容、请求取消、指标边界和时间计算；模拟网络响应，并在测试后恢复 mock。当前未设置覆盖率阈值。提交前运行类型检查、lint、测试和构建；界面改动还应检查桌面与移动端、亮色与暗色模式。

## 提交与 Pull Request

近期提交常用 `feat:` 和 `fix:`，也存在普通祈使句；新提交优先采用简短的类型前缀描述，例如 `fix: 修复流量统计边界`。

PR 应说明问题、改动效果和验证结果，关联相关 issue；视觉改动附截图。发布时保持 `theme.json` 与 `package.json` 版本一致；推送到 `main` 可自动发布尚不存在的版本，手动标签须匹配 `vX.Y.Z`。

## 配置与产物

主题设置通过 `/api/themes/LuminaPlus/config` 保存在 hub 数据库；保存需要登录，避免重新引入旧版 `localStorage` 或 `theme-settings.json` 配置来源。不要提交凭证、`.env`、`dist/` 或 `theme.tar.gz`。更新预览图时修改 `docs/images/monitor-theme-preview.png`，打包脚本会同步根目录的 `preview.png`。
