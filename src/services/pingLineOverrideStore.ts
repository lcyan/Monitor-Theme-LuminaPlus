import {
  EMPTY_PING_LINE_OVERRIDES,
  EMPTY_PING_LINE_OVERRIDES_BY_NODE,
  nodePingLineOverrides,
  normalizePingLineOverrides,
  normalizePingLineOverridesByNode,
  type PingLineOverrides,
  type PingLineOverridesByNode,
} from "@/utils/pingLineOverrides";

/**
 * 在首页卡片上点线路名换过的线路（多线路模式），按节点 uuid 分开存在本机。
 *
 * 故意不进任何主题设置的存储：设置那份是全局存 hub 的（管理员改、所有访客生效），
 * 换线路是访客自己的视图偏好——只记逐节点、逐行的差异，站点/单独配置照旧打底。
 * monitor 没有「换线并进后端配置」那层（管理员要按节点固定线路走「按服务器配置」面板），
 * 所以这里只有本机一份，换回默认即从存储里删掉。
 */

const STORAGE_KEY = "monitor-luminaplus:ping-line-overrides";

type Listener = () => void;

const listeners = new Set<Listener>();
let cache: PingLineOverridesByNode | null = null;

function readStorage(): PingLineOverridesByNode {
  if (cache) return cache;
  let parsed: unknown = null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // 存储不可用或内容损坏：当作谁都没换过，首页照常按默认线路画。
  }
  // 已知任务校验在消费方做（useNodeCardModel 按该节点的可用任务过滤），
  // 这里只做结构归一化——存储模块不依赖 ping 数据层。
  cache = normalizePingLineOverridesByNode(parsed);
  return cache;
}

function persist(next: PingLineOverridesByNode) {
  cache = next;
  try {
    if (Object.keys(next).length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    // 隐私模式/配额用尽时写不进去，本次会话内照样生效。
    console.warn("[LuminaPlus] 线路切换无法写入本地存储", error);
  }
  emit();
}

function sameOverrides(left: PingLineOverrides, right: PingLineOverrides) {
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => left[key] === right[key])
  );
}

/** 这台节点换过的行；没换过返回共享的空表，可以直接当 useSyncExternalStore 的快照。 */
export function getPingLineOverrides(uuid: string): PingLineOverrides {
  return nodePingLineOverrides(readStorage(), uuid);
}

/** 整份替换这台节点的覆盖表；传空表 = 这台节点恢复默认。 */
export function setPingLineOverrides(uuid: string, overrides: PingLineOverrides): void {
  if (!uuid || uuid === "__proto__") return;
  const normalized = normalizePingLineOverrides(overrides);
  if (sameOverrides(getPingLineOverrides(uuid), normalized)) return;
  // 只换这一台的条目，其余节点的对象引用不变 —— 它们的卡片不会因为别人换线路而重渲染。
  const next: Record<string, PingLineOverrides> = { ...readStorage() };
  if (normalized === EMPTY_PING_LINE_OVERRIDES) delete next[uuid];
  else next[uuid] = normalized;
  persist(Object.keys(next).length > 0 ? next : EMPTY_PING_LINE_OVERRIDES_BY_NODE);
}

export function subscribePingLineOverrides(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

// 另一个标签页换了线路时同步过来。
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    cache = null;
    emit();
  });
}
