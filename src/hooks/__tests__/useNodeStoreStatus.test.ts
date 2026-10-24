import { describe, expect, it } from "vitest";
import { isNodeStoreHydrating } from "@/hooks/useNode";

// 回归:Assets/Traffic 此前对节点 store 没有水合门控,冷加载直链时设置就绪而节点未到,
// 「暂无节点数据」这个终态文案会先闪出来(慢网络下持续数秒)。Home/Instance 都有门控,口径须一致。
describe("isNodeStoreHydrating", () => {
  it("reports waiting while the first node list has neither arrived nor failed", () => {
    expect(isNodeStoreHydrating({ hydrated: false, nodeInfoError: false })).toBe(true);
  });

  it("stops waiting once hydrated", () => {
    expect(isNodeStoreHydrating({ hydrated: true, nodeInfoError: false })).toBe(false);
  });

  it("stops waiting when the node list failed (the page shows its own error copy)", () => {
    expect(isNodeStoreHydrating({ hydrated: false, nodeInfoError: true })).toBe(false);
  });
});
