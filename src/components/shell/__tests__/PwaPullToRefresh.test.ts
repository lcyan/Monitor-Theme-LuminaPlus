import { describe, expect, it } from "vitest";
import { PULL_IGNORED_TARGETS, isIosStandalone } from "@/components/shell/PwaPullToRefresh";

describe("iOS PWA detection", () => {
  it("enables pull-to-refresh for installed iPhone and iPad apps", () => {
    expect(isIosStandalone("Mozilla/5.0 (iPhone)", "iPhone", 5, true, false)).toBe(true);
    expect(isIosStandalone("Mozilla/5.0 (Macintosh)", "MacIntel", 5, false, true)).toBe(true);
  });

  it("does not change normal Safari, Android PWA, or desktop behavior", () => {
    expect(isIosStandalone("Mozilla/5.0 (iPhone)", "iPhone", 5, false, false)).toBe(false);
    expect(isIosStandalone("Mozilla/5.0 (Linux; Android 15)", "Linux armv8l", 5, true, true)).toBe(false);
    expect(isIosStandalone("Mozilla/5.0 (Macintosh)", "MacIntel", 0, true, true)).toBe(false);
  });
});

// 回归:这两个弹层自身可滚动、portal 到 body 且不是 role=dialog,此前不在白名单里,
// 页面在顶部时列表内的上滑会被 preventDefault 劫持,拉够 56px 还会整页 reload。
describe("pull-to-refresh ignored targets", () => {
  it("ignores the instance switcher panel and ping line menu", () => {
    expect(PULL_IGNORED_TARGETS).toContain(".instance-switcher-panel");
    expect(PULL_IGNORED_TARGETS).toContain(".ping-line-menu");
  });

  it("still ignores dialogs, the color picker, and the renewal panel", () => {
    expect(PULL_IGNORED_TARGETS).toContain("[role='dialog']");
    expect(PULL_IGNORED_TARGETS).toContain(".metric-color-picker");
    expect(PULL_IGNORED_TARGETS).toContain(".renewal-reminder-panel");
  });
});
