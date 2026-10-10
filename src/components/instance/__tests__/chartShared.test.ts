import { describe, expect, it } from "vitest";
import {
  buildLoadTimeRangeOptions,
  buildPingTimeRangeOptions,
} from "@/components/instance/chartShared";

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
