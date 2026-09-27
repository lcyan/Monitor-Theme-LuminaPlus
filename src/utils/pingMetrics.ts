import type { PingRecord, PingTask, PingTaskStats } from "@/types/models";

export const PING_LATENCY_METRIC = "ping.latency_ms";
export const PING_LOSS_METRIC = "ping.loss";

interface PingMetricPoint {
  time: string;
  value: number | null;
  count: number;
}

export interface PingMetricSeries {
  metricKey: string;
  client: string;
  tags: Record<string, string>;
  intervalSeconds?: number;
  points: PingMetricPoint[];
}

function parseTaskId(tags: Record<string, string>) {
  const parsed = Number.parseInt(tags.task_id ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function seriesKey(client: string, taskId: number) {
  return `${client}\u0000${taskId}`;
}

export function resolvePingSampleCounts(
  sample: Pick<PingRecord, "value" | "count" | "loss">,
) {
  const total =
    typeof sample.count === "number" && Number.isFinite(sample.count) && sample.count > 0
      ? Math.max(1, Math.round(sample.count))
      : 1;
  const reportedLoss = sample.loss;
  const lost =
    typeof reportedLoss === "number" && Number.isFinite(reportedLoss)
      ? Math.min(total, Math.max(0, Math.round((reportedLoss / 100) * total)))
      : sample.value < 0
        ? total
        : 0;
  return { total, lost, valid: total - lost };
}

/** 返回图表使用的 0–100 丢包百分比；旧 records 数据没有 loss 时由负延迟推导。 */
export function resolvePingRecordLossPercent(record: PingRecord) {
  if (typeof record.loss === "number" && Number.isFinite(record.loss)) {
    return Math.min(100, Math.max(0, record.loss));
  }
  const { total, lost } = resolvePingSampleCounts(record);
  return (lost / total) * 100;
}

export interface PingLossSample {
  time: number;
  lost: number;
  total: number;
}

/**
 * 把原始丢包样本归并到图表降采样后的时间格上。
 *
 * 必须用加权平均（lost/total），不能像延迟那样取桶内极值：一桶里出现一次 100% 丢包
 * 就把整段染红，读者会以为断了几分钟。
 *
 * 对齐方式是「就近归入最接近的目标时刻」——降采样用的是等宽时间桶，桶心即目标时刻，
 * 就近归并与原桶划分至多差一格，而一格在屏幕上不到 1px。
 * 返回值与 targetTimes 等长：该格没有任何样本时是 null（无数据），有样本才是百分比。
 */
export function bucketPingLoss(
  samples: PingLossSample[],
  targetTimes: number[],
): Array<number | null> {
  const out = new Array<number | null>(targetTimes.length).fill(null);
  if (targetTimes.length === 0 || samples.length === 0) return out;

  const lost = new Array<number>(targetTimes.length).fill(0);
  const total = new Array<number>(targetTimes.length).fill(0);

  for (const sample of samples) {
    if (!Number.isFinite(sample.time) || sample.total <= 0) continue;
    const index = nearestIndex(targetTimes, sample.time);
    lost[index] += sample.lost;
    total[index] += sample.total;
  }

  for (let index = 0; index < targetTimes.length; index += 1) {
    if (total[index] > 0) {
      out[index] = Math.min(100, Math.max(0, (lost[index] / total[index]) * 100));
    }
  }
  return out;
}

/** 丢包百分比：不足 1% 时保留一位小数，否则取整，免得每行都拖着 0.0%。 */
export function formatPingLoss(pct: number) {
  return pct > 0 && pct < 1 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`;
}

/**
 * Ping tooltip 里一行的数值。
 *
 * 丢包在前、延迟在后：tooltip 的数值列是右对齐的，把延迟固定放在末尾，
 * 有丢包的那行和没丢包的那行 ms 才落在同一列上。
 * 丢包 0 不写出来，避免每行拖一截噪音；整点全丢时延迟本来就是空的，
 * 这时只报丢包，比一个「—」有用。
 */
export function formatPingTooltipValue(
  latencyMs: number | null,
  lossPct: number | null,
): string {
  const hasLoss = lossPct != null && lossPct > 0;
  if (latencyMs == null) return hasLoss ? `丢包 ${formatPingLoss(lossPct)}` : "—";
  const latency = `${latencyMs.toFixed(1)} ms`;
  return hasLoss ? `丢包 ${formatPingLoss(lossPct)} · ${latency}` : latency;
}

/** 升序数组里离 value 最近的下标。 */
function nearestIndex(sorted: number[], value: number): number {
  let low = 0;
  let high = sorted.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (sorted[mid] < value) low = mid + 1;
    else high = mid;
  }
  if (low > 0 && Math.abs(sorted[low - 1] - value) <= Math.abs(sorted[low] - value)) {
    return low - 1;
  }
  return low;
}

function pointTimeKey(time: string) {
  const timestamp = Date.parse(time);
  return Number.isFinite(timestamp) ? String(timestamp) : time;
}

/** 长区间图表必须优先使用后端聚合间隔，而不是原始 Ping 任务周期。 */
export function resolvePingChartInterval(
  metricIntervalSeconds: number | null | undefined,
  taskIntervalSeconds: number | null | undefined,
  fallbackSeconds = 60,
) {
  for (const value of [metricIntervalSeconds, taskIntervalSeconds, fallbackSeconds]) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 60;
}

/**
 * 将新版 metric API 的 latency/loss 聚合序列还原成旧图表可消费的 PingRecord。
 *
 * latency 的 rollup 平均值仍把 -1 丢包样本算在分母里；已知同桶 loss 比例与 count
 * 时可由 `(avgAll * total + lost) / valid` 恢复成功样本均值。这样长时间窗口不会因
 * 少量丢包被人为拉低延迟曲线。
 */
export function mergePingMetricSeries(series: PingMetricSeries[]): PingRecord[] {
  const lossSeries = new Map<string, PingMetricSeries>();
  for (const item of series) {
    if (item.metricKey !== PING_LOSS_METRIC) continue;
    const taskId = parseTaskId(item.tags);
    if (taskId == null || !item.client) continue;
    lossSeries.set(seriesKey(item.client, taskId), item);
  }

  const records: PingRecord[] = [];
  for (const latency of series) {
    if (latency.metricKey !== PING_LATENCY_METRIC) continue;
    const taskId = parseTaskId(latency.tags);
    if (taskId == null || !latency.client) continue;

    const matchingLoss = lossSeries.get(seriesKey(latency.client, taskId));
    const lossByTime = new Map(
      (matchingLoss?.points ?? []).map((point) => [pointTimeKey(point.time), point] as const),
    );

    for (const point of latency.points) {
      const lossPoint = lossByTime.get(pointTimeKey(point.time));
      const total = Math.max(point.count, lossPoint?.count ?? 0);
      if (total <= 0) continue; // fill_empty 产生的空格，不伪造成丢包。

      const fallbackLossRatio = point.value != null && point.value < 0 ? 1 : 0;
      const lossRatio = Math.max(
        0,
        Math.min(1, lossPoint?.value ?? fallbackLossRatio),
      );
      const lost = Math.min(total, Math.max(0, Math.round(lossRatio * total)));
      const valid = total - lost;

      let value: number;
      if (valid <= 0) {
        value = -1;
      } else if (point.value == null) {
        // 有样本但 latency 为 null 只应出现在全丢包桶；防御性地跳过不完整响应。
        continue;
      } else if (lost > 0) {
        value = (point.value * total + lost) / valid;
      } else {
        value = point.value;
      }

      records.push({
        task_id: taskId,
        time: point.time,
        value,
        client: latency.client,
        count: total,
        loss: lossRatio * 100,
      });
    }
  }

  // 预解析时间戳,避免比较器里 O(n log n) 次 Date.parse;不可解析的时间归一到
  // +Infinity(排最后),让比较器满足传递性。
  const decorated = records.map((record) => {
    const timeMs = Date.parse(String(record.time));
    return { record, timeMs: Number.isFinite(timeMs) ? timeMs : Number.POSITIVE_INFINITY };
  });
  decorated.sort((left, right) => {
    if (left.timeMs !== right.timeMs) return left.timeMs - right.timeMs;
    if (left.record.client !== right.record.client) {
      return left.record.client.localeCompare(right.record.client);
    }
    return left.record.task_id - right.record.task_id;
  });
  return decorated.map(({ record }) => record);
}

export function reconcilePingMetricStats(
  stats: PingTaskStats[],
  records: PingRecord[],
): PingTaskStats[] {
  const totals = new Map<
    string,
    { total: number; valid: number; lost: number; latencySum: number }
  >();

  for (const record of records) {
    if (!record.client || !Number.isFinite(record.task_id)) continue;
    const { total: count, lost, valid } = resolvePingSampleCounts(record);
    const key = seriesKey(record.client, record.task_id);
    const current = totals.get(key) ?? {
      total: 0,
      valid: 0,
      lost: 0,
      latencySum: 0,
    };
    current.total += count;
    current.valid += valid;
    current.lost += lost;
    if (record.value >= 0 && valid > 0) {
      current.latencySum += record.value * valid;
    }
    totals.set(key, current);
  }

  return stats.map((stat) => {
    const total = totals.get(seriesKey(stat.client, stat.taskId));
    if (!total || total.total <= 0) return stat;
    return {
      ...stat,
      total: total.total,
      valid: total.valid,
      loss: (total.lost / total.total) * 100,
      avg: total.valid > 0 ? total.latencySum / total.valid : null,
    };
  });
}

/** 把按节点返回的统计行去重成旧 UI 使用的任务清单。 */
export function pingTasksFromMetricStats(stats: PingTaskStats[]): PingTask[] {
  const tasks = new Map<number, PingTask>();
  for (const stat of stats) {
    const existing = tasks.get(stat.taskId);
    if (existing) {
      if (stat.client && !existing.clients.includes(stat.client)) {
        existing.clients.push(stat.client);
      }
      continue;
    }
    tasks.set(stat.taskId, {
      id: stat.taskId,
      interval: stat.interval || 60,
      name: stat.name || `任务 #${stat.taskId}`,
      loss: stat.loss,
      clients: stat.client ? [stat.client] : [],
      type: stat.type || "icmp",
      target: "",
      weight: stat.taskId,
    });
  }
  return [...tasks.values()].sort((left, right) => left.id - right.id);
}
