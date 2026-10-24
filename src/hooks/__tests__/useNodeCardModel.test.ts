import { describe, expect, it } from "vitest";
import {
  resolveHomepagePingFallback,
  shouldRenderHomepagePingBars,
} from "@/hooks/useNodeCardModel";

describe("homepage ping bar visibility", () => {
  it("keeps assigned ping bars visible without a real task binding", () => {
    expect(shouldRenderHomepagePingBars(false, true)).toBe(true);
    expect(shouldRenderHomepagePingBars(false, false)).toBe(false);
    expect(shouldRenderHomepagePingBars(true, false)).toBe(true);
  });
});

// 回归:多线路开启但一行都配不出来时(「按服务器单独配置」的任务全被后台撤销),
// 回退分支此前用的是被自身开关禁用的单线路数据源(loadState 恒 pending),
// 卡片永久停在「加载中」。决策现在收敛在这个纯函数里,各种状态各有归属。
describe("homepage ping fallback resolution", () => {
  it("keeps the multi-line display when rows exist", () => {
    expect(resolveHomepagePingFallback({ displayLineCount: 3, backendLineCount: 3, overviewSettled: true })).toEqual({
      mode: "multi",
      hasBinding: true,
    });
  });

  it("falls back to the first backend line when the display has no rows", () => {
    expect(resolveHomepagePingFallback({ displayLineCount: 0, backendLineCount: 1, overviewSettled: true })).toEqual({
      mode: "fallback-line",
      hasBinding: true,
    });
  });

  it("treats an in-flight overview as still loading instead of unconfigured", () => {
    expect(resolveHomepagePingFallback({ displayLineCount: 0, backendLineCount: 0, overviewSettled: false })).toEqual({
      mode: "fallback-loading",
      hasBinding: true,
    });
  });

  it("reports unconfigured once the overview settles with no backend lines at all", () => {
    expect(resolveHomepagePingFallback({ displayLineCount: 0, backendLineCount: 0, overviewSettled: true })).toEqual({
      mode: "fallback-unconfigured",
      hasBinding: false,
    });
  });
});
