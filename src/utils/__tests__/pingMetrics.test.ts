import { describe, expect, it } from "vitest";
import type { PingTaskStats } from "@/types/models";
import {
  bucketPingLoss,
  formatPingLoss,
  formatPingTooltipValue,
  mergePingMetricSeries,
  pingTasksFromMetricStats,
  reconcilePingMetricStats,
  resolvePingSampleCounts,
  resolvePingChartInterval,
  PING_LATENCY_METRIC,
  PING_LOSS_METRIC,
  type PingMetricSeries,
} from "@/utils/pingMetrics";

const CLIENT = "node-a";
const TIME = "2026-07-13T02:00:00Z";

function series(
  metricKey: string,
  value: number | null,
  count: number,
): PingMetricSeries {
  return {
    metricKey,
    client: CLIENT,
    tags: { task_id: "7" },
    points: [{ time: TIME, value, count }],
  };
}

describe("mergePingMetricSeries", () => {
  it("restores the successful-sample latency average from rollup loss metadata", () => {
    // 原始值 50/60/70/80/-1：metric latency 的全样本均值为 51.8，loss=20%。
    const records = mergePingMetricSeries([
      series(PING_LATENCY_METRIC, 51.8, 5),
      series(PING_LOSS_METRIC, 0.2, 5),
    ]);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      client: CLIENT,
      task_id: 7,
      time: TIME,
      count: 5,
      loss: 20,
    });
    expect(records[0].value).toBeCloseTo(65, 8);
  });

  it("keeps an all-loss bucket as a real gap but drops fill_empty buckets", () => {
    const allLost = mergePingMetricSeries([
      series(PING_LATENCY_METRIC, null, 2),
      series(PING_LOSS_METRIC, 1, 2),
    ]);
    expect(allLost).toHaveLength(1);
    expect(allLost[0]).toMatchObject({ value: -1, count: 2, loss: 100 });

    const empty = mergePingMetricSeries([
      series(PING_LATENCY_METRIC, null, 0),
      series(PING_LOSS_METRIC, null, 0),
    ]);
    expect(empty).toEqual([]);
  });
});

describe("resolvePingChartInterval", () => {
  it("uses the 7-day rollup interval instead of splitting points by the raw task cadence", () => {
    expect(resolvePingChartInterval(15 * 60, 60)).toBe(15 * 60);
    expect(resolvePingChartInterval(undefined, 60)).toBe(60);
  });
});

describe("resolvePingSampleCounts", () => {
  it("uses aggregate count and loss percentage instead of treating a bucket as one sample", () => {
    expect(resolvePingSampleCounts({ value: 45, count: 20, loss: 25 })).toEqual({
      total: 20,
      lost: 5,
      valid: 15,
    });
  });

  it("falls back safely for malformed metadata and keeps legacy loss records", () => {
    expect(resolvePingSampleCounts({ value: 12, count: Number.NaN, loss: Number.NaN })).toEqual({
      total: 1,
      lost: 0,
      valid: 1,
    });
    expect(resolvePingSampleCounts({ value: -1 })).toEqual({
      total: 1,
      lost: 1,
      valid: 0,
    });
  });
});

describe("reconcilePingMetricStats", () => {
  it("recomputes count, loss and average from repaired aggregate records", () => {
    const base: PingTaskStats = {
      client: CLIENT,
      taskId: 7,
      name: "广州探测",
      type: "icmp",
      interval: 60,
      total: 2,
      valid: 2,
      loss: 0,
      min: 20,
      max: 80,
      avg: 30,
      latest: 35,
      p50: 36,
      p99: 79,
      stddev: 5,
      p99P50Ratio: 1.1,
    };

    const [reconciled] = reconcilePingMetricStats([base], [
      {
        client: CLIENT,
        task_id: 7,
        time: TIME,
        value: 40,
        count: 4,
        loss: 25,
      },
      {
        client: CLIENT,
        task_id: 7,
        time: "2026-07-13T02:01:00Z",
        value: 70,
        count: 2,
        loss: 50,
      },
    ]);

    expect(reconciled).toMatchObject({
      total: 6,
      valid: 4,
      avg: 47.5,
      latest: 35,
      p99: 79,
    });
    expect(reconciled.loss).toBeCloseTo(100 / 3, 10);
  });
});

describe("bucketPingLoss", () => {
  it("merges samples into the nearest target slot by weighted average", () => {
    const targets = [100, 200, 300];
    const out = bucketPingLoss(
      [
        { time: 95, lost: 0, total: 3 },
        { time: 105, lost: 1, total: 1 },
        { time: 290, lost: 50, total: 100 },
      ],
      targets,
    );
    // 95/105 都就近归入 100：加权 (0/3 + 1/1)/4 = 25%。
    expect(out[0]).toBeCloseTo(25, 8);
    // 200 没有任何样本：保持 null（无数据），与丢包 0% 区分。
    expect(out[1]).toBeNull();
    expect(out[2]).toBeCloseTo(50, 8);
  });

  it("keeps partial bucket loss instead of snapping it to 100%", () => {
    const out = bucketPingLoss([{ time: 100, lost: 66.7, total: 100 }], [100]);
    expect(out[0]).toBeCloseTo(66.7, 8);
  });

  it("returns all null for empty samples and skips malformed entries", () => {
    expect(bucketPingLoss([], [100, 200])).toEqual([null, null]);
    expect(bucketPingLoss([{ time: Number.NaN, lost: 1, total: 1 }], [100])).toEqual([null]);
    expect(bucketPingLoss([{ time: 100, lost: 1, total: 0 }], [100])).toEqual([null]);
    expect(bucketPingLoss([{ time: 100, lost: 5, total: 10 }], [])).toEqual([]);
  });
});

describe("formatPingLoss", () => {
  it("keeps one decimal below 1% and rounds otherwise", () => {
    expect(formatPingLoss(0)).toBe("0%");
    expect(formatPingLoss(0.5)).toBe("0.5%");
    expect(formatPingLoss(3.4)).toBe("3%");
    expect(formatPingLoss(100)).toBe("100%");
  });
});

describe("formatPingTooltipValue", () => {
  it("puts loss before latency and omits zero-loss noise", () => {
    expect(formatPingTooltipValue(20, 0)).toBe("20.0 ms");
    expect(formatPingTooltipValue(20, 0.4)).toBe("丢包 0.4% · 20.0 ms");
    expect(formatPingTooltipValue(null, 100)).toBe("丢包 100%");
    expect(formatPingTooltipValue(null, null)).toBe("—");
  });
});

describe("pingTasksFromMetricStats", () => {
  it("deduplicates per-client stats into one task and preserves assigned clients", () => {
    const base: PingTaskStats = {
      client: CLIENT,
      taskId: 7,
      name: "广州探测",
      type: "icmp",
      interval: 60,
      total: 10,
      valid: 9,
      loss: 10,
      min: 20,
      max: 80,
      avg: 40,
      latest: 35,
      p50: 36,
      p99: 79,
      stddev: 5,
      p99P50Ratio: 1.1,
    };

    const tasks = pingTasksFromMetricStats([
      base,
      { ...base, client: "node-b", loss: 0 },
    ]);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: 7,
      name: "广州探测",
      interval: 60,
      clients: [CLIENT, "node-b"],
    });
  });
});
