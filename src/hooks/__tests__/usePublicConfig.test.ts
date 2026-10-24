import { describe, expect, it } from "vitest";
import { shouldInvalidatePublicConfig } from "@/hooks/usePublicConfig";

// 回归:私有站点在新标签页登录后返回,门禁靠 ["me"] 的 focus 重拉解除,
// 但 ["public"] 里按匿名跳过的主题配置没有任何失效机制——页面停留首页期间
// 永远按空配置渲染,此时进设置页保存还会以空配置为基底整份覆盖线上设置。
describe("shouldInvalidatePublicConfig", () => {
  it("invalidates when the visitor becomes logged in", () => {
    expect(shouldInvalidatePublicConfig(false, true)).toBe(true);
  });

  it("does not invalidate when the page loaded already logged in", () => {
    // 首帧就是登录态:那份 public 配置本来就是带鉴权拉的,无需失效。
    expect(shouldInvalidatePublicConfig(true, true)).toBe(false);
  });

  it("does not invalidate on logout transitions", () => {
    expect(shouldInvalidatePublicConfig(true, false)).toBe(false);
    expect(shouldInvalidatePublicConfig(false, false)).toBe(false);
  });
});
