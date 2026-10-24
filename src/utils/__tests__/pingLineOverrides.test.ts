import { describe, expect, it } from "vitest";
import {
  normalizePingLineOverrides,
  pickKnownPingLineOverrides,
  resolveNodePingLineTaskIds,
} from "@/utils/pingLineOverrides";

describe("pickKnownPingLineOverrides", () => {
  // 回归:模型侧把指向已撤销任务的覆盖过滤掉,换线菜单此前却用原始覆盖计算
  // 「当前选中」——菜单高亮任务 #5、卡片实际画的是默认线路,各说各话。
  const known = new Set([1, 2]);

  it("drops overrides pointing at revoked tasks", () => {
    expect(pickKnownPingLineOverrides(normalizePingLineOverrides({ 0: 5, 1: 2 }), known)).toEqual({
      1: 2,
    });
  });

  it("keeps overrides for known tasks verbatim", () => {
    expect(pickKnownPingLineOverrides(normalizePingLineOverrides({ 0: 2, 1: 1 }), known)).toEqual({
      0: 2,
      1: 1,
    });
  });

  it("resolves the filtered overrides back to the default rows", () => {
    const base = [1, 2];
    const filtered = pickKnownPingLineOverrides(normalizePingLineOverrides({ 0: 5 }), known);
    expect(resolveNodePingLineTaskIds(base, filtered)).toEqual(base);
  });
});
