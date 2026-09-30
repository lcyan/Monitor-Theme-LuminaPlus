import type { ThemeSettings } from "@/types/models";
import {
  DEFAULT_BACKGROUND_ALIGNMENT,
  DEFAULT_BACKGROUND_SCRIM,
  DEFAULT_BACKGROUND_VIDEO_URL,
  DEFAULT_SURFACE_OPACITY,
  normalizeBackgroundAlignment,
  normalizeBackgroundScrim,
  normalizeBackgroundUrl,
  normalizeBackgroundVideoUrl,
  normalizeSurfaceOpacity,
} from "@/utils/background";
import {
  DEFAULT_COST_RATE_API_URL,
  normalizeCostIgnoredNodes,
  normalizeCostPremiums,
  normalizeCostRateApiUrl,
  type CostPremiumEntry,
} from "@/utils/cost";
import { normalizeNodeIdentityList } from "@/utils/nodeIdentity";
import {
  normalizeHomeGroupOrder,
  normalizeHomeRegionOrder,
} from "@/utils/homeNodes";
import {
  HOME_SORT_NATURAL_DIRECTION,
  isHomeSortDirection,
  isHomeSortField,
  type HomeSortDirection,
  type HomeSortField,
} from "@/utils/homeSort";
import {
  normalizeHomepageMultiPingTaskIds,
  normalizeHomepageMultiPingNodeTaskIds,
  normalizeHomepagePingTaskBindings,
  type HomepageMultiPingNodeTaskIds,
  type HomepagePingTaskBindings,
} from "@/utils/pingTasks";
import { DEFAULT_RENEWAL_REMINDER_DAYS, MAX_RENEWAL_REMINDER_DAYS } from "@/utils/renewalReminder";

export type Appearance = "system" | "light" | "dark";
export type NodeViewMode = "large" | "compact" | "mini" | "list";
export type BackgroundMediaType = "image" | "video";
export type AmbientEffect =
  | "sakura"
  | "rain"
  | "snow"
  | "leaves"
  | "confetti"
  | "fireworks";

export const MAX_FIXED_FAKE_PING_LINES = 24;

export const AMBIENT_EFFECTS: readonly AmbientEffect[] = [
  "sakura",
  "rain",
  "snow",
  "leaves",
  "confetti",
  "fireworks",
];

export interface ResolvedThemeSettings {
  defaultAppearance: Appearance;
  desktopNodeViewMode: NodeViewMode;
  mobileNodeViewMode: NodeViewMode;
  enableAdminButton: boolean;
  hideAdminEntryWhenLoggedOut: boolean;
  showPingChart: boolean;
  homepagePingBindings: HomepagePingTaskBindings;
  /** 单线路模式的站点默认线路（任务 id；0 = 未设置，未绑定节点回退后台首条任务）。 */
  homepageDefaultPingTaskId: number;
  enableHomepageMultiPing: boolean;
  homepageMultiPingTaskIds: number[];
  homepageMultiPingNodeTaskIds: HomepageMultiPingNodeTaskIds;
  fakePingForUnbound: boolean;
  fakePingLineCount: "auto" | number;
  enableHomeHeaderAutoHide: boolean;
  homeHeaderVisibleSeconds: number;
  showHomeOverview: boolean;
  /** 「资产概览」总览卡的独立开关（不跟着整排总览走）。 */
  showAssetOverview: boolean;
  showGroupTabs: boolean;
  showRegionBar: boolean;
  showCardGroup: boolean;
  homeGroupOrder: string[];
  /** 地区栏的地区顺序（设置页调整）；未列出的按默认地理优先级。 */
  homeRegionOrder: string[];
  /** 首屏预选的节点分组；空串 = 「全部」。 */
  homeDefaultGroup: string;
  enableHomeSort: boolean;
  /** 离线节点排最前（CFSM 对齐；缺省沉底）。 */
  offlineNodesFirst: boolean;
  homeSortField: HomeSortField;
  homeSortDirection: HomeSortDirection;
  /** 大卡片是否显示续费价格（小卡片等布局不受影响）。 */
  showCardPrice: boolean;
  /** 续费提醒提前天数：0~60，0 = 不提醒。 */
  renewalReminderDays: number;
  showCostsToGuests: boolean;
  showCostSummary: boolean;
  showCostSummaryFloatingButton: boolean;
  showOverviewRatings: boolean;
  showTrafficRating: boolean;
  showBandwidthRating: boolean;
  showAssetRating: boolean;
  trafficRatingLabels: string;
  bandwidthRatingLabels: string;
  assetRatingLabels: string;
  compactShowTrafficTotal: boolean;
  compactShowBilling: boolean;
  compactShowUptime: boolean;
  showConnections: boolean;
  showTodayTrafficPopover: boolean;
  hiddenNodes: string[];
  costIgnoredNodes: string[];
  costPremiums: Record<string, CostPremiumEntry>;
  costRateApiUrl: string;
  enableBackgroundImage: boolean;
  backgroundMediaType: BackgroundMediaType;
  backgroundImage: string;
  backgroundImageMobile: string;
  backgroundVideo: string;
  backgroundVideoDark: string;
  backgroundAlignment: string;
  surfaceOpacity: number;
  /** 背景遮罩强度(0–100):浅色模式用 --bg-0 提亮,深色模式压暗,保护眼睛。 */
  backgroundScrim: number;
  backgroundScrimDark: number;
  enableAmbientEffect: boolean;
  ambientEffect: AmbientEffect;
}

export const DEFAULT_THEME_SETTINGS: ResolvedThemeSettings = {
  defaultAppearance: "system",
  desktopNodeViewMode: "large",
  mobileNodeViewMode: "compact",
  enableAdminButton: true,
  hideAdminEntryWhenLoggedOut: false,
  showPingChart: true,
  homepagePingBindings: {},
  homepageDefaultPingTaskId: 0,
  // CFSM 默认开启多线路；一条线路都没选时首页按单线路回退，行为与关闭等价。
  enableHomepageMultiPing: true,
  homepageMultiPingTaskIds: [],
  homepageMultiPingNodeTaskIds: {},
  fakePingForUnbound: false,
  fakePingLineCount: "auto",
  enableHomeHeaderAutoHide: false,
  homeHeaderVisibleSeconds: 10,
  showHomeOverview: true,
  showAssetOverview: true,
  showGroupTabs: true,
  showRegionBar: true,
  showCardGroup: true,
  homeGroupOrder: [],
  homeRegionOrder: [],
  homeDefaultGroup: "",
  enableHomeSort: true,
  offlineNodesFirst: false,
  homeSortField: "default",
  homeSortDirection: HOME_SORT_NATURAL_DIRECTION.default,
  showCardPrice: true,
  renewalReminderDays: DEFAULT_RENEWAL_REMINDER_DAYS,
  showCostsToGuests: true,
  showCostSummary: true,
  showCostSummaryFloatingButton: true,
  showOverviewRatings: true,
  showTrafficRating: true,
  showBandwidthRating: true,
  showAssetRating: true,
  trafficRatingLabels: "",
  bandwidthRatingLabels: "",
  assetRatingLabels: "",
  compactShowTrafficTotal: true,
  compactShowBilling: true,
  compactShowUptime: true,
  showConnections: false,
  showTodayTrafficPopover: true,
  hiddenNodes: [],
  costIgnoredNodes: [],
  costPremiums: {},
  costRateApiUrl: DEFAULT_COST_RATE_API_URL,
  enableBackgroundImage: true,
  backgroundMediaType: "image",
  backgroundImage: "",
  backgroundImageMobile: "",
  backgroundVideo: DEFAULT_BACKGROUND_VIDEO_URL,
  backgroundVideoDark: "",
  backgroundAlignment: DEFAULT_BACKGROUND_ALIGNMENT,
  surfaceOpacity: DEFAULT_SURFACE_OPACITY,
  backgroundScrim: DEFAULT_BACKGROUND_SCRIM,
  backgroundScrimDark: DEFAULT_BACKGROUND_SCRIM,
  enableAmbientEffect: false,
  ambientEffect: "sakura",
};

export function isAppearance(value: unknown): value is Appearance {
  return value === "system" || value === "light" || value === "dark";
}

function normalizeAppearance(
  value: unknown,
  fallback: Appearance = DEFAULT_THEME_SETTINGS.defaultAppearance,
): Appearance {
  return isAppearance(value) ? value : fallback;
}

export function isNodeViewMode(value: unknown): value is NodeViewMode {
  return value === "large" || value === "compact" || value === "mini" || value === "list";
}

function normalizeNodeViewMode(
  value: unknown,
  fallback: NodeViewMode,
): NodeViewMode {
  if (isNodeViewMode(value)) return value;
  // 未知旧字符串统一落到小卡，避免升级后出现无选中项。
  return typeof value === "string" && value.length > 0 ? "compact" : fallback;
}

// 列表档仅桌面可用(见 useViewMode 的 MOBILE_VIEW_MODES)。移动端即便配置里存了 "list"
// (历史值/外部写入)也归一化回默认档,避免管理页无选中项、首页又强制回落 compact 的不一致。
function normalizeMobileNodeViewMode(
  value: unknown,
  fallback: NodeViewMode,
): NodeViewMode {
  const mode = normalizeNodeViewMode(value, fallback);
  return mode === "list" ? fallback : mode;
}

function enabledUnlessFalse(value: unknown) {
  return value !== false;
}

export function normalizeHomeHeaderVisibleSeconds(value: unknown) {
  const seconds =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(seconds)) return DEFAULT_THEME_SETTINGS.homeHeaderVisibleSeconds;
  return Math.min(3600, Math.max(1, Math.round(seconds)));
}

export function shouldShowAdminEntry(
  settings: Pick<
    ResolvedThemeSettings,
    "enableAdminButton" | "hideAdminEntryWhenLoggedOut"
  >,
  loggedIn: boolean,
) {
  // enableAdminButton 是旧版隐藏字段，继续保留其全局禁用语义；新设置只对未登录访客生效。
  return (
    settings.enableAdminButton &&
    (loggedIn || !settings.hideAdminEntryWhenLoggedOut)
  );
}

export function canViewCosts(
  settings: Pick<ResolvedThemeSettings, "showCostsToGuests">,
  loggedIn: boolean,
) {
  return loggedIn || settings.showCostsToGuests;
}

function normalizePlainText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeBackgroundMediaType(value: unknown): BackgroundMediaType {
  return value === "video" ? "video" : "image";
}

export function isAmbientEffect(value: unknown): value is AmbientEffect {
  return typeof value === "string" && AMBIENT_EFFECTS.includes(value as AmbientEffect);
}

function normalizeAmbientEffect(value: unknown): AmbientEffect {
  return isAmbientEffect(value) ? value : DEFAULT_THEME_SETTINGS.ambientEffect;
}

// 管理员默认排序:字段非法回落 default;方向非法时回落该字段的自然方向(文本升、数值降)。
function normalizeHomeSortDefault(
  field: unknown,
  direction: unknown,
): { homeSortField: HomeSortField; homeSortDirection: HomeSortDirection } {
  const homeSortField = isHomeSortField(field) ? field : "default";
  return {
    homeSortField,
    homeSortDirection: isHomeSortDirection(direction)
      ? direction
      : HOME_SORT_NATURAL_DIRECTION[homeSortField],
  };
}

/** 单线路默认线路：只认正整数任务 id；0/写坏 = 未设置（回退后台首条任务）。 */
function normalizeHomepageDefaultPingTaskId(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeHomeDefaultGroup(value: unknown): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim().slice(0, 120) : "";
}

/** 提醒天数：0~60 的整数，0 = 不提醒；写坏了回到默认。 */
function normalizeRenewalReminderDays(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_RENEWAL_REMINDER_DAYS;
  return Math.min(MAX_RENEWAL_REMINDER_DAYS, Math.max(0, Math.round(parsed)));
}

export function normalizeThemeSettings(
  settings: (ThemeSettings & Record<string, unknown>) | null | undefined,
): ResolvedThemeSettings {
  const homepageMultiPingTaskIds = normalizeHomepageMultiPingTaskIds(
    settings?.homepageMultiPingTaskIds,
  );
  return {
    defaultAppearance: normalizeAppearance(settings?.defaultAppearance),
    desktopNodeViewMode: normalizeNodeViewMode(
      settings?.desktopNodeViewMode,
      DEFAULT_THEME_SETTINGS.desktopNodeViewMode,
    ),
    mobileNodeViewMode: normalizeMobileNodeViewMode(
      settings?.mobileNodeViewMode,
      DEFAULT_THEME_SETTINGS.mobileNodeViewMode,
    ),
    enableAdminButton: enabledUnlessFalse(settings?.enableAdminButton),
    hideAdminEntryWhenLoggedOut:
      settings?.hideAdminEntryWhenLoggedOut === true,
    showPingChart: enabledUnlessFalse(settings?.showPingChart),
    homepagePingBindings: normalizeHomepagePingTaskBindings(settings?.homepagePingBindings),
    homepageDefaultPingTaskId: normalizeHomepageDefaultPingTaskId(
      settings?.homepageDefaultPingTaskId,
    ),
    // 保留开关原值，让管理页能呈现并修复尚未选择默认线路的配置。
    enableHomepageMultiPing: enabledUnlessFalse(settings?.enableHomepageMultiPing),
    homepageMultiPingTaskIds,
    homepageMultiPingNodeTaskIds: normalizeHomepageMultiPingNodeTaskIds(
      settings?.homepageMultiPingNodeTaskIds,
    ),
    // 默认关闭(需手动开启):给访客展示的是模拟数据,必须由站长显式决定。
    fakePingForUnbound: settings?.fakePingForUnbound === true,
    fakePingLineCount:
      typeof settings?.fakePingLineCount === "number" &&
      Number.isFinite(settings.fakePingLineCount) &&
      Number.isInteger(settings.fakePingLineCount) &&
      settings.fakePingLineCount > 0
        ? Math.min(MAX_FIXED_FAKE_PING_LINES, settings.fakePingLineCount)
        : "auto",
    enableHomeHeaderAutoHide: settings?.enableHomeHeaderAutoHide === true,
    homeHeaderVisibleSeconds: normalizeHomeHeaderVisibleSeconds(
      settings?.homeHeaderVisibleSeconds,
    ),
    showHomeOverview: enabledUnlessFalse(settings?.showHomeOverview),
    showAssetOverview: enabledUnlessFalse(settings?.showAssetOverview),
    showGroupTabs: enabledUnlessFalse(settings?.showGroupTabs),
    showRegionBar: enabledUnlessFalse(settings?.showRegionBar),
    showCardGroup: enabledUnlessFalse(settings?.showCardGroup),
    homeGroupOrder: normalizeHomeGroupOrder(settings?.homeGroupOrder),
    homeRegionOrder: normalizeHomeRegionOrder(settings?.homeRegionOrder),
    homeDefaultGroup: normalizeHomeDefaultGroup(settings?.homeDefaultGroup),
    enableHomeSort: enabledUnlessFalse(settings?.enableHomeSort),
    offlineNodesFirst: settings?.offlineNodesFirst === true,
    ...normalizeHomeSortDefault(settings?.homeSortField, settings?.homeSortDirection),
    // 默认公开以保持存量站点升级后的展示行为；站长可显式关闭访客费用展示。
    showCostsToGuests: enabledUnlessFalse(settings?.showCostsToGuests),
    showCostSummary: enabledUnlessFalse(settings?.showCostSummary),
    showCostSummaryFloatingButton: enabledUnlessFalse(settings?.showCostSummaryFloatingButton),
    showOverviewRatings: enabledUnlessFalse(settings?.showOverviewRatings),
    showTrafficRating: enabledUnlessFalse(settings?.showTrafficRating),
    showBandwidthRating: enabledUnlessFalse(settings?.showBandwidthRating),
    showAssetRating: enabledUnlessFalse(settings?.showAssetRating),
    showCardPrice: enabledUnlessFalse(settings?.showCardPrice),
    renewalReminderDays: normalizeRenewalReminderDays(settings?.renewalReminderDays),
    trafficRatingLabels: normalizePlainText(settings?.trafficRatingLabels),
    bandwidthRatingLabels: normalizePlainText(settings?.bandwidthRatingLabels),
    assetRatingLabels: normalizePlainText(settings?.assetRatingLabels),
    compactShowTrafficTotal: enabledUnlessFalse(settings?.compactShowTrafficTotal),
    compactShowBilling: enabledUnlessFalse(settings?.compactShowBilling),
    compactShowUptime: enabledUnlessFalse(settings?.compactShowUptime),
    // 默认关闭(需手动开启):连接数是个小众指标,很多 agent 也不上报,所以只在显式启用时才显示。
    showConnections: settings?.showConnections === true,
    showTodayTrafficPopover: enabledUnlessFalse(settings?.showTodayTrafficPopover),
    hiddenNodes: normalizeNodeIdentityList(settings?.hiddenNodes),
    costIgnoredNodes: normalizeCostIgnoredNodes(settings?.costIgnoredNodes),
    costPremiums: normalizeCostPremiums(settings?.costPremiums),
    costRateApiUrl: normalizeCostRateApiUrl(settings?.costRateApiUrl),
    // 默认开:让已配置背景图的存量站点升级后行为不变;关闭 = 保留 URL 但不加载背景图。
    enableBackgroundImage: enabledUnlessFalse(settings?.enableBackgroundImage),
    backgroundMediaType: normalizeBackgroundMediaType(settings?.backgroundMediaType),
    backgroundImage: normalizeBackgroundUrl(settings?.backgroundImage),
    backgroundImageMobile: normalizeBackgroundUrl(settings?.backgroundImageMobile),
    backgroundVideo:
      normalizeBackgroundVideoUrl(settings?.backgroundVideo) || DEFAULT_BACKGROUND_VIDEO_URL,
    backgroundVideoDark: normalizeBackgroundVideoUrl(settings?.backgroundVideoDark),
    backgroundAlignment: normalizeBackgroundAlignment(settings?.backgroundAlignment),
    surfaceOpacity: normalizeSurfaceOpacity(settings?.surfaceOpacity),
    // 默认 0:升级后观感与之前完全一致,需要压暗背景时由站长自己调。
    backgroundScrim: normalizeBackgroundScrim(settings?.backgroundScrim),
    backgroundScrimDark: normalizeBackgroundScrim(settings?.backgroundScrimDark),
    // 环境动效默认关闭；保存的预设仍会保留，方便站长关闭后再次开启。
    enableAmbientEffect: settings?.enableAmbientEffect === true,
    ambientEffect: normalizeAmbientEffect(settings?.ambientEffect),
  };
}
