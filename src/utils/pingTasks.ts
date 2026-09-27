export type HomepagePingTaskBindings = Record<string, string[]>;
export type HomepageMultiPingNodeTaskIds = Record<string, number[]>;

/**
 * 多线路模式最多同时显示几条线路（与 CFSM 的槽位上限一致：8）。选满 8 条后设置页的
 * 「添加线路」按钮禁用，normalize 也会把超出的部分裁掉。
 */
export const HOMEPAGE_MULTI_PING_MAX_COUNT = 8;

/** 至少选几条才算配置好。**1 条也是合法配置**：站长可能只关心一条线路，但仍想要
 * 多线路模式那套「每条线各一行延迟 + 丢包」的排版。选 0 条回退单线路模式。 */
export const HOMEPAGE_MULTI_PING_MIN_COUNT = 1;

/** 多线路模式的任务选够了没有。首页消费方与设置页的校验共用这一条口径。 */
export function isHomepageMultiPingConfigured(taskIds: readonly number[]): boolean {
  return taskIds.length >= HOMEPAGE_MULTI_PING_MIN_COUNT;
}

const invertedBindingsCache = new WeakMap<HomepagePingTaskBindings, Map<string, number>>();

function parseTaskId(taskId: string) {
  if (!/^\d+$/.test(taskId)) return null;
  const parsed = Number(taskId);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function normalizeHomepageMultiPingTaskIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  const normalized: number[] = [];
  for (const raw of value) {
    const taskId =
      typeof raw === "number" && Number.isSafeInteger(raw) && raw > 0
        ? raw
        : typeof raw === "string"
          ? parseTaskId(raw)
          : null;
    if (taskId == null || normalized.includes(taskId)) continue;
    normalized.push(taskId);
    if (normalized.length === HOMEPAGE_MULTI_PING_MAX_COUNT) break;
  }
  return normalized;
}

export function normalizeHomepageMultiPingNodeTaskIds(
  value: unknown,
): HomepageMultiPingNodeTaskIds {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized: HomepageMultiPingNodeTaskIds = {};
  const entries = Object.entries(value).sort(([left], [right]) =>
    left.trim().localeCompare(right.trim()),
  );
  for (const [rawUuid, rawTaskIds] of entries) {
    const uuid = rawUuid.trim();
    const taskIds = normalizeHomepageMultiPingTaskIds(rawTaskIds);
    if (!uuid || taskIds.length === 0) continue;
    normalized[uuid] = taskIds;
  }
  return normalized;
}

export function createHomepageMultiPingTaskOverride(
  currentTaskIds: number[] | undefined,
  globalTaskIds: number[],
  availableTaskIds: number[],
): number[] | null {
  if (currentTaskIds) return null;

  const available = new Set(
    availableTaskIds.filter(
      (taskId) => Number.isSafeInteger(taskId) && taskId > 0,
    ),
  );
  const orderedTaskIds = orderHomepagePingTaskIds([...available], globalTaskIds);
  return orderedTaskIds.length > 0 ? orderedTaskIds : null;
}

/**
 * 把后台分配的任务按全局线路选择排到前面（仅用于设置页「按服务器单独配置」的
 * 初始化排序——首页显示线路已改用 CFSM 口径的全局选择，不再经过这里）。
 */
export function orderHomepagePingTaskIds(
  assignedTaskIds: number[],
  preferredTaskIds: number[],
): number[] {
  const assigned = normalizeHomepageMultiPingTaskIds(assignedTaskIds);
  const assignedSet = new Set(assigned);
  const preferred = normalizeHomepageMultiPingTaskIds(preferredTaskIds)
    .filter((taskId) => assignedSet.has(taskId));
  const preferredSet = new Set(preferred);
  return [...preferred, ...assigned.filter((taskId) => !preferredSet.has(taskId))];
}

/**
 * 多线路模式下这台节点实际显示哪几条线路（CFSM 口径）：全局选中的任务就是显示的
 * 线路与条数，选几条所有节点就显示几条。节点未被后台分配某条线路时，由调用方
 * （useNodeCardModel）渲染「未分配」占位行，而不是悄悄少一行。按服务器单独配置的
 * 节点仍按其显式选择显示（限定在后台分配范围内）。全局一条都没选时返回空数组——
 * 调用方应回退单线路模式（isHomepageMultiPingConfigured 为 false）。
 */
export function resolveVisibleHomepagePingTaskIds(
  uuid: string,
  assignedTaskIds: number[],
  preferredTaskIds: number[],
  nodeTaskIds: HomepageMultiPingNodeTaskIds,
): number[] {
  const preferred = normalizeHomepageMultiPingTaskIds(preferredTaskIds);
  if (preferred.length === 0) return [];
  const override = normalizeHomepageMultiPingTaskIds(nodeTaskIds[uuid]);
  if (override.length === 0) return preferred;
  const assigned = new Set(normalizeHomepageMultiPingTaskIds(assignedTaskIds));
  return override.filter((taskId) => assigned.has(taskId));
}

export function normalizeHomepagePingTaskBindings(
  value: unknown,
): HomepagePingTaskBindings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized: HomepagePingTaskBindings = {};
  for (const [taskId, clients] of Object.entries(value)) {
    const numericTaskId = parseTaskId(taskId);
    if (numericTaskId == null || !Array.isArray(clients)) continue;

    const uniqueClients = Array.from(
      new Set(
        clients
          .map((client) => (typeof client === "string" ? client.trim() : ""))
          .filter(Boolean),
      ),
    );
    if (uniqueClients.length === 0) {
      continue;
    }

    const normalizedTaskId = String(numericTaskId);
    normalized[normalizedTaskId] = Array.from(
      new Set([...(normalized[normalizedTaskId] ?? []), ...uniqueClients]),
    );
  }

  return normalized;
}

export function invertHomepagePingTaskBindings(
  bindings: HomepagePingTaskBindings,
): Map<string, number> {
  const cached = invertedBindingsCache.get(bindings);
  if (cached) return cached;

  const selectedTaskByClient = new Map<string, number>();
  const entries = Object.entries(normalizeHomepagePingTaskBindings(bindings)).sort(
    ([left], [right]) => Number(left) - Number(right),
  );

  for (const [taskId, clients] of entries) {
    const numericTaskId = parseTaskId(taskId);
    if (numericTaskId == null) continue;
    for (const client of clients) {
      if (!selectedTaskByClient.has(client)) {
        selectedTaskByClient.set(client, numericTaskId);
      }
    }
  }

  invertedBindingsCache.set(bindings, selectedTaskByClient);
  return selectedTaskByClient;
}
