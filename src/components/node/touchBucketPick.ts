/**
 * 触屏点选延迟/丢包柱子的共用口径。
 *
 * 三种渲染层各画各的（大卡/列表是 canvas、紧凑卡是 DOM、迷你卡是 SVG），但「点一下看数值」
 * 这件事必须一模一样，否则同一个面板换个视图手感就变了。这里只放两条规则，剩下的各自实现。
 *
 * 为什么触屏要单独一套：柱子的数值原来只有 hover 能看，而触屏根本没有 hover ——
 * `supportsFineHover()` 在触屏上恒为 false，于是手机上那排格子点了没有任何反应。
 */

/**
 * 点一下之后气泡还留多久。
 *
 * 抬手就收太短：手指本身压在柱子上，挪开才看得见。2.5 秒够读完「12:34 · 128ms」那一行，
 * 又不至于杵在那儿挡住卡片。
 */
export const TOUCH_BUCKET_HOLD_MS = 2_500;

/**
 * 按下的位置落在第几根柱子上。
 *
 * 判定按**整条的宽度**均分，而不是各根柱子自己的命中区 —— 一根柱子连间距才 4~5px，
 * 手指点不中，点到缝里就什么都不发生。整条都可点才叫能用。
 */
export function resolveTouchBucketIndex(
  clientX: number,
  rect: { left: number; width: number },
  count: number,
): number | null {
  if (count <= 0 || rect.width <= 0) return null;
  const ratio = (clientX - rect.left) / rect.width;
  return Math.max(0, Math.min(count - 1, Math.floor(ratio * count)));
}

/**
 * 触屏选桶会话的收尾状态机（pick / leave / cancel）。
 *
 * cancel 是滚动抢走指针的信号（iOS/Android 在元素上起滚时必发 pointercancel）：
 * 这一下不是「想看数值」，气泡和选中一律收掉、长按计时作废 —— 与 CanvasStrip 的
 * `endTouch(event, false)` 同一口径。leave 则相反：长按保持期间不能抢收尾（手指只是
 * 划出了柱区），空闲时才清。
 */
export interface TouchBucketSessionState {
  hoveredIndex: number | null;
  selectedIndex: number | null;
  /** 长按计时是否在跑（决定 leave 能不能抢收尾）。 */
  holdActive: boolean;
}

export type TouchBucketSessionEvent =
  | { type: "pick"; index: number }
  | { type: "cancel" }
  | { type: "leave" };

export const IDLE_TOUCH_BUCKET_SESSION: TouchBucketSessionState = {
  hoveredIndex: null,
  selectedIndex: null,
  holdActive: false,
};

export function reduceTouchBucketSession(
  state: TouchBucketSessionState,
  event: TouchBucketSessionEvent,
): TouchBucketSessionState {
  switch (event.type) {
    case "pick":
      return { hoveredIndex: event.index, selectedIndex: event.index, holdActive: true };
    case "cancel":
      return IDLE_TOUCH_BUCKET_SESSION;
    case "leave":
      return state.holdActive ? state : IDLE_TOUCH_BUCKET_SESSION;
  }
}
