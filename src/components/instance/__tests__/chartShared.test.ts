import { describe, expect, it } from "vitest";
import {
  buildLoadTimeRangeOptions,
  buildPingTimeRangeOptions,
  resolveTooltipGrid,
} from "@/components/instance/chartShared";

// 回归:丢包率视图渲染自己的降采样网格,tooltip 的列下标对应的是它的时间格;
// 此前 dataRef 永远指向延迟网格,延迟毫秒被格式化成「丢包 x%」,断点哨兵分叉时时间也错位。
describe("resolveTooltipGrid", () => {
  const latencyGrid = [[10, 20, 30], [1, 2, 3]] as unknown as [number[], ...number[][]];
  const lossGrid = [[10, 20], [0.5, 4]] as unknown as [number[], ...number[][]];

  it("uses the latency grid in the latency view", () => {
    expect(resolveTooltipGrid("latency", latencyGrid, lossGrid)).toBe(latencyGrid);
  });

  it("switches to the loss grid in the loss view", () => {
    expect(resolveTooltipGrid("loss", latencyGrid, lossGrid)).toBe(lossGrid);
  });

  it("falls back to the latency grid when the loss grid is not ready", () => {
    expect(resolveTooltipGrid("loss", latencyGrid, null)).toBe(latencyGrid);
  });
});

describe("detail chart time ranges", () => {
  it("offers the documented history windows when 90 days are retained", () => {
    expect(buildPingTimeRangeOptions(90 * 24)).toEqual([
      { label: "1 小时", value: 1 },
      { label: "6 小时", value: 6 },
      { label: "1 天", value: 24 },
      { label: "7 天", value: 168 },
      { label: "30 天", value: 720 },
      { label: "90 天", value: 2160 },
    ]);
  });

  it("offers the full retained range for load history", () => {
    expect(buildLoadTimeRangeOptions(90 * 24)).toEqual([
      { label: "实时", value: 0 },
      { label: "1 小时", value: 1 },
      { label: "6 小时", value: 6 },
      { label: "1 天", value: 24 },
      { label: "7 天", value: 168 },
      { label: "30 天", value: 720 },
      { label: "90 天", value: 2160 },
    ]);
  });

  it("drops a nearby preset and appends a non-standard retention window", () => {
    expect(buildPingTimeRangeOptions(8 * 24)).toEqual([
      { label: "1 小时", value: 1 },
      { label: "6 小时", value: 6 },
      { label: "1 天", value: 24 },
      { label: "8 天", value: 8 * 24 },
    ]);
  });

  it("keeps the documented long retention limit instead of stopping at 90 days", () => {
    expect(buildLoadTimeRangeOptions(365 * 24).at(-1)).toEqual({
      label: "365 天",
      value: 365 * 24,
    });
  });
});
