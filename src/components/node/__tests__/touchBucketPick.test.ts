import { describe, expect, it } from "vitest";
import {
  reduceTouchBucketSession,
  resolveTouchBucketIndex,
  TOUCH_BUCKET_HOLD_MS,
} from "@/components/node/touchBucketPick";

const rect = { left: 100, width: 180 };

describe("触屏点选延迟柱子", () => {
  it("按整条宽度均分：手指落在哪一段就是哪一根", () => {
    // 30 格、180px：一格 6px。柱子本身只有 4~5px 宽，按柱子自己的命中区算就点不中。
    expect(resolveTouchBucketIndex(100, rect, 30)).toBe(0);
    expect(resolveTouchBucketIndex(100 + 6 * 15 + 3, rect, 30)).toBe(15);
    expect(resolveTouchBucketIndex(100 + 179, rect, 30)).toBe(29);
  });

  it("按到条外也给个结果：夹到两端，不返回 null 让这一下白点", () => {
    expect(resolveTouchBucketIndex(80, rect, 30)).toBe(0);
    expect(resolveTouchBucketIndex(400, rect, 30)).toBe(29);
  });

  it("没有格子、或者还没量到宽度时不选", () => {
    expect(resolveTouchBucketIndex(150, rect, 0)).toBeNull();
    expect(resolveTouchBucketIndex(150, { left: 0, width: 0 }, 30)).toBeNull();
  });

  it("气泡留的时间够读完一行，又不至于杵着挡卡片", () => {
    expect(TOUCH_BUCKET_HOLD_MS).toBeGreaterThanOrEqual(1_500);
    expect(TOUCH_BUCKET_HOLD_MS).toBeLessThanOrEqual(5_000);
  });
});

// 回归:紧凑卡(DOM)与迷你卡(SVG)的触屏选桶此前没有 pointercancel 分支——
// 从柱区起手滚动页面时浏览器会抢走指针,气泡却已弹出并滞留到 2.5s 计时到期。
// canvas 层(CanvasStrip.endTouch(event,false))早就是这个口径,收尾状态机必须一致。
describe("reduceTouchBucketSession", () => {
  const holding = { hoveredIndex: 3, selectedIndex: 3, holdActive: true };
  const idle = { hoveredIndex: null, selectedIndex: null, holdActive: false };

  it("cancel 收掉气泡和选中,无论长按计时在不在跑", () => {
    expect(reduceTouchBucketSession(holding, { type: "cancel" })).toEqual(idle);
    expect(reduceTouchBucketSession(idle, { type: "cancel" })).toEqual(idle);
  });

  it("pick 选中该格并进入长按保持", () => {
    expect(reduceTouchBucketSession(idle, { type: "pick", index: 5 })).toEqual({
      hoveredIndex: 5,
      selectedIndex: 5,
      holdActive: true,
    });
  });

  it("leave 在长按保持期间不抢收尾,空闲时才清", () => {
    expect(reduceTouchBucketSession(holding, { type: "leave" })).toEqual(holding);
    expect(reduceTouchBucketSession({ hoveredIndex: 2, selectedIndex: null, holdActive: false }, { type: "leave" })).toEqual(idle);
  });
});
