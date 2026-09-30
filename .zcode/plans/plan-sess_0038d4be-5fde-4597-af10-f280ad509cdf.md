# 本项目 ↔ Komari-Theme-LuminaPlus 对齐计划

## 背景结论（探索已完成）

三仓链条：`shanyang242/Komari-Theme-LuminaPlus`（v1.3.5）→ `kure29/Monitor-Theme-LuminaPlus`（9-19 从约 v1.3.4 快照移植）→ 本地（含 kure29 全部提交 + 自有提交）。

已确认：本地设置字段是上游超集（上游 50 字段全有，另多 9 个）；上游有本地无的仅 7 个文件，全部依赖 Komari 专属后端（IP-Info 插件 ×4、AdminRecovery/useAdminEntryPath/rpc2Client ×3、komariServiceWorker ×1）；本地 `api.ts` 已按 Monitor 文档对接全部接口。**功能面基本对齐，剩余工作是精确审计 + 少量补齐 + pnpm 迁移。**

## 实施步骤

### 1. 克隆上游做精确 diff（用户已要求直接 clone）
- `git clone --depth 1 https://github.com/shanyang242/Komari-Theme-LuminaPlus %TEMP%\lumina-komari`
- `git clone --depth 1 https://github.com/kure29/Monitor-Theme-LuminaPlus %TEMP%\lumina-kure29`
- 确认本地包含 kure29 上游全部提交（git log 对比），确认无落后。

### 2. 逐文件差异审计
- `git diff --no-index` 对比上游与本地 `src/`，对每个差异文件分类：**Monitor 适配 / 本地新增 / 真实差距**。
- 按上游 release notes（v1.2.1→v1.3.5）做功能清单逐项核对，重点确认这些行为细节在本地无漂移：
  - 流量配额「已用/∞」无上限显示、按到期日推导「今日重置/X 天后重置」
  - 延迟五档绝对分级阈值（≤60/≤100/≤160/≤200/>200ms）
  - 历史图表降采样保留峰值、各视图柱图等高统一
  - 收购溢价按收购日期回算、续费提醒过滤离线节点
  - 视频背景失败回退背景图、省流量/触屏不加载、Safari 毛玻璃修复
  - 今日流量悬浮窗、总览评级自定义名称、页眉定时隐藏（1–3600s）
- 审计 Komari 专属 7 文件确认无 Monitor 可用对应能力（IP：monitor 不下发匿名 IP 且无插件 API，README 已记录；admin 三件套与 SW：monitor 无对应机制），在 README「当前限制」补一句明确说明（可选）。

### 3. 落实审计发现的差距修复
- 对审计出的真实差距逐项修复（预计少量），每项配/改对应 vitest 测试。
- IP 信息页签：**不移植**（保持现状，遵 Monitor 接口约束）。

### 4. 元数据核对
- `theme.json` 的 `url` 当前指向 `github.com/lcyan/...`，README 说维护仓库是 `kure29/...` —— 核对哪个仓库实际发布 release（后台刷新按钮依赖 `url` 的 release 取 `theme.tar.gz`），不一致则以实际发布仓库为准修正。
- 版本号：保持自有 0.x 版本线（theme.json 与 package.json 同步递增）。

### 5. pnpm 迁移（用户要求：npm → pnpm）
- `package.json`：加 `"packageManager": "pnpm@<本机版本>"`；`package` script 里 `npm run build` 改为 `pnpm run build`（或直接串联命令）。
- 用 `pnpm import` 从 package-lock.json 生成 `pnpm-lock.yaml`，删除 `package-lock.json`（如存在）。
- `.github/workflows/release.yml`：改用 `pnpm/action-setup` + `pnpm install --frozen-lockfile` + `pnpm run package`。
- `README.md`：`npm ci` → `pnpm install`，提交前检查命令改为 pnpm。

### 6. 验证
- `pnpm install` 后跑 `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build`、`pnpm package`。
- 校验 `theme.tar.gz` 结构（`dist/ + theme.json + preview.png`）与 Monitor 限制（整包 32MiB、单文件 8MiB 等）。

### 7. 交付
- 输出一份对齐矩阵总结（上游功能 ↔ 本地实现点 ↔ 状态：已对齐/monitor 不适用/本次修复）。

## 明确不做（Monitor 接口不支持，保持不移植）
- IP 信息页签及 IP-Info 插件四件套
- AdminRecovery / useAdminEntryPath / rpc2Client（Komari admin RPC 与后台路径插件）
- komariServiceWorker（站点级 /sw.js 接管，上游自己也已弃用式处理）