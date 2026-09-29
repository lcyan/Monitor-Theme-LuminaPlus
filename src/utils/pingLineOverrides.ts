import { HOMEPAGE_MULTI_PING_MAX_COUNT } from "@/utils/pingTasks";

/**
 * 访客在多线路卡片上点线路名换过的线路，一台节点一份：`{ 行号: 线路 id }`。行号从 0 起，
 * 对应这台节点多线路列表（全局选择或按服务器单独配置解析出的那几行）的下标。
 *
 * 只记「和默认不一样的行」，不整份拷贝 —— 站长以后在设置页调线路，访客没动过的行照样跟着走。
 *
 * 与 CFSM 的差异：CFSM 还有一层「站长把本机换线并进站点配置（homepagePingLineOverrides）」；
 * monitor 的设置全局存 hub，站长要按节点固定线路走「按服务器配置」面板（homepageMultiPingNodeTaskIds），
 * 这里不重复做换线持久化，访客换的只留在本机。
 */
export type PingLineOverrides = Readonly<Record<string, number>>;

/** 没换过时的共享空表：引用稳定，store 快照和 memo 依赖可以直接拿它比较。 */
export const EMPTY_PING_LINE_OVERRIDES: PingLineOverrides = Object.freeze({});

/** 各节点的覆盖表：`{ uuid: { 行号: 线路 id } }`（本机存储的形状）。 */
export type PingLineOverridesByNode = Readonly<Record<string, PingLineOverrides>>;

export const EMPTY_PING_LINE_OVERRIDES_BY_NODE: PingLineOverridesByNode = Object.freeze({});

/** 取某台节点的覆盖表。uuid 来自存储内容，按普通对象的键直接读会撞上原型上的 `constructor` 之类。 */
export function nodePingLineOverrides(
  byNode: PingLineOverridesByNode,
  uuid: string,
): PingLineOverrides {
  return Object.prototype.hasOwnProperty.call(byNode, uuid)
    ? byNode[uuid]!
    : EMPTY_PING_LINE_OVERRIDES;
}

const SLOT_KEY_PATTERN = /^(0|[1-9]\d*)$/;

function isPositiveTaskId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/**
 * 存储里读出来的东西不可信：行号只认规范写法（不认 `01`）、且不超过多线路条数上限；线路 id 只认
 * 正整数，再由 `isKnownTaskId` 按线路表筛一遍（util 层不依赖 services，线路表由调用方带进来）。
 */
export function normalizePingLineOverrides(
  value: unknown,
  isKnownTaskId: (taskId: number) => boolean = () => true,
): PingLineOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return EMPTY_PING_LINE_OVERRIDES;
  }
  const normalized: Record<string, number> = {};
  for (const [slot, taskId] of Object.entries(value)) {
    if (!SLOT_KEY_PATTERN.test(slot) || Number(slot) >= HOMEPAGE_MULTI_PING_MAX_COUNT) {
      continue;
    }
    if (!isPositiveTaskId(taskId) || !isKnownTaskId(taskId)) continue;
    normalized[slot] = taskId;
  }
  return Object.keys(normalized).length > 0 ? normalized : EMPTY_PING_LINE_OVERRIDES;
}

/**
 * 这台节点实际显示哪几条线路：默认线路表打底，本机换过的行盖上去。条数永远跟默认表走。
 *
 * 盖完出现重复（站长后来改了设置，恰好把访客换上的那条排进了别的行）时整份退回默认表 ——
 * 同一条线路画两行没有意义，逐行猜「该让哪行让位」只会让访客更摸不着头脑。
 * 没有生效的覆盖时原样返回 `baseTaskIds`，引用不变，可以直接进依赖数组。
 */
export function resolveNodePingLineTaskIds(
  baseTaskIds: readonly number[],
  overrides: PingLineOverrides = EMPTY_PING_LINE_OVERRIDES,
): readonly number[] {
  let changed = false;
  const resolved = baseTaskIds.map((taskId, slot) => {
    const override = overrides[String(slot)];
    if (override == null || override === taskId) return taskId;
    changed = true;
    return override;
  });
  if (!changed) return baseTaskIds;
  return new Set(resolved).size === resolved.length ? resolved : baseTaskIds;
}

/**
 * 把第 `slot` 行换成 `taskId`，返回新的覆盖表。
 *
 * 选中的线路已经在别的行显示时两行互换，不会画出两行一样的线路。换回和默认一致的行会从表里
 * 删掉，所以全部换回去之后得到的就是空表（等于恢复默认）；过期的行（超出现在的条数）顺手丢掉。
 */
export function switchPingLine(
  baseTaskIds: readonly number[],
  overrides: PingLineOverrides,
  slot: number,
  taskId: number,
): PingLineOverrides {
  const displayed = [...resolveNodePingLineTaskIds(baseTaskIds, overrides)];
  if (
    !Number.isInteger(slot) ||
    slot < 0 ||
    slot >= displayed.length ||
    !isPositiveTaskId(taskId) ||
    displayed[slot] === taskId
  ) {
    return overrides;
  }
  const shownAt = displayed.indexOf(taskId);
  if (shownAt >= 0) displayed[shownAt] = displayed[slot]!;
  displayed[slot] = taskId;

  const next: Record<string, number> = {};
  displayed.forEach((id, index) => {
    if (id !== baseTaskIds[index]) next[String(index)] = id;
  });
  return Object.keys(next).length > 0 ? next : EMPTY_PING_LINE_OVERRIDES;
}

/** 整份各节点覆盖表的归一化：空节点、非法 uuid 丢掉，一台都不剩时返回共享空表。 */
export function normalizePingLineOverridesByNode(
  value: unknown,
  isKnownTaskId?: (taskId: number) => boolean,
): PingLineOverridesByNode {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return EMPTY_PING_LINE_OVERRIDES_BY_NODE;
  }
  const normalized: Record<string, PingLineOverrides> = {};
  for (const [uuid, overrides] of Object.entries(value)) {
    if (!uuid || uuid === "__proto__") continue;
    const node = normalizePingLineOverrides(overrides, isKnownTaskId);
    if (node !== EMPTY_PING_LINE_OVERRIDES) normalized[uuid] = node;
  }
  return Object.keys(normalized).length > 0 ? normalized : EMPTY_PING_LINE_OVERRIDES_BY_NODE;
}
