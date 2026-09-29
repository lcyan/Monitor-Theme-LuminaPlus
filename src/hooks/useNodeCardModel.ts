import { useMemo } from "react";
import { useFakePingFallback } from "@/hooks/useFakePing";
import { useHourlyClock, useMinuteClock } from "@/hooks/useClock";
import { useNodeCardSnapshots } from "@/hooks/useNode";
import {
  buildPingBuckets,
  useNodePingOverview,
  useNodePingOverviewLines,
  usePingBuckets,
  usePingTaskNames,
  useNodePingLineOverrides,
} from "@/hooks/usePingOverview";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import type { HomepagePingDisplayLine } from "@/types/models";
import { formatRenewalPrice } from "@/utils/billing";
import { getExpireTextColor } from "@/utils/expireStatus";
import { getTrafficResetDisplay } from "@/utils/trafficReset";
import {
  formatBytes,
  formatByteRate,
  formatExpireDays,
  formatUptimeDays,
  joinDisplayParts,
  parseTags,
} from "@/utils/format";
import {
  latencyHeatColor,
  lossHeatColor,
  trafficUsageColor,
} from "@/utils/metricTone";
import { resolveTrafficUsage, trafficTypeLabel, type TrafficDisplay } from "@/utils/traffic";
import { resolveOsInfo } from "@/components/ui/OsLogo";
import {
  isHomepageMultiPingConfigured,
  resolveVisibleHomepagePingTaskIds,
} from "@/utils/pingTasks";
import {
  resolveNodePingLineTaskIds,
  type PingLineOverrides,
} from "@/utils/pingLineOverrides";

interface NodeCardModelOptions {
  pingBucketCount?: number;
  includeMultiPing?: boolean;
}

export function shouldRenderHomepagePingBars(
  hasRealHomepagePingBinding: boolean,
  pingIsAssigned: boolean,
) {
  return hasRealHomepagePingBinding || pingIsAssigned;
}

export function useNodeCardModel(
  uuid: string,
  {
    pingBucketCount,
    includeMultiPing = false,
  }: NodeCardModelOptions = {},
) {
  const { meta, metrics, trafficTrend } = useNodeCardSnapshots(uuid);
  const {
    showCardGroup,
    showCardPrice,
    fakePingForUnbound,
    enableHomepageMultiPing,
    homepageMultiPingTaskIds,
    homepageMultiPingNodeTaskIds,
  } = useThemeSettings();
  const pingTaskNames = usePingTaskNames();
  // CFSM 口径：选 1~8 条都算多线路开启，选 0 条回退单线路（按节点各自的绑定显示一条）。
  const multiPingActive =
    includeMultiPing &&
    enableHomepageMultiPing &&
    isHomepageMultiPingConfigured(homepageMultiPingTaskIds);
  const realPing = useNodePingOverview(uuid, !multiPingActive);
  const realPingLines = useNodePingOverviewLines(uuid, multiPingActive);
  const hasRealHomepagePingBinding = useMemo(
    () => multiPingActive || realPing.isAssigned || realPing.loadState === "error",
    [multiPingActive, realPing.isAssigned, realPing.loadState],
  );
  const now = useHourlyClock();
  const ping = useFakePingFallback(
    uuid,
    realPing,
    metrics?.online === true,
    fakePingForUnbound && !multiPingActive,
  );
  // 状态跟随每条任务数据进入 Store,不再订阅全局 isRefreshing。这样后台轮询开始/结束
  // 时不会让所有节点卡片仅因一个布尔值变化而重渲染。
  const pingLoading =
    hasRealHomepagePingBinding && (ping.loadState ?? "pending") === "pending";
  const pingError =
    hasRealHomepagePingBinding && ping.loadState === "error";
  const shouldRenderPingBars = shouldRenderHomepagePingBars(
    hasRealHomepagePingBinding,
    ping.isAssigned,
  );
  // 掉线后延迟/丢包柱按最后一次上报截断，之后的格子涂红。用 `updatedAt` 而不是
  // 「发现掉线的时刻」：前者是节点真正停止上报的时间，红色从那里开始才对得上。
  const offlineSince =
    metrics && metrics.online === false && metrics.updatedAt > 0 ? metrics.updatedAt : null;
  const pingBuckets = usePingBuckets(
    ping,
    pingBucketCount,
    !multiPingActive,
    offlineSince,
  );
  // 与 usePingBuckets 同理:窗口按分钟前移,不依赖数据刷新才滑动。
  const bucketNow = useMinuteClock(multiPingActive);
  const localLineOverrides = useNodePingLineOverrides(uuid);
  // 行序与条数由全局线路选择决定（CFSM 口径）：选几条所有节点就显示几行；
  // 这台节点未被后台分配某条线路时保留该行，显示「未分配/无样本」。
  // 访客本机换过的行（PingLineSwitcher）盖在其上：换向后台已撤销的任务时自动回落默认。
  const homepagePingLines = useMemo<HomepagePingDisplayLine[]>(() => {
    if (
      !multiPingActive
    ) {
      return [];
    }
    const baseTaskIds = resolveVisibleHomepagePingTaskIds(
      uuid,
      realPingLines.map((line) => line.taskId),
      homepageMultiPingTaskIds,
      homepageMultiPingNodeTaskIds,
    );
    const knownTaskIds = new Set<number>([
      ...baseTaskIds,
      ...realPingLines.map((line) => line.taskId),
    ]);
    const effectiveOverrides: PingLineOverrides = Object.fromEntries(
      Object.entries(localLineOverrides).filter(([, taskId]) => knownTaskIds.has(taskId)),
    );
    const visibleTaskIds = resolveNodePingLineTaskIds(baseTaskIds, effectiveOverrides);
    // 按行号渲染而不是按任务 id：访客在某行换了线路后，这一行的位置和行数保持稳定。
    return visibleTaskIds
      .map((taskId): HomepagePingDisplayLine | null => {
        const loaded = realPingLines.find((line) => line.taskId === taskId);
        if (loaded) {
          const sourceLine = loaded;
          if (sourceLine.isAssigned === false) return null;
          return {
            ...sourceLine,
            buckets: buildPingBuckets(sourceLine, pingBucketCount, bucketNow, offlineSince),
          };
        }
        const unassigned: HomepagePingDisplayLine = {
          client: uuid,
          taskId,
          taskName: pingTaskNames.get(taskId) ?? `任务 #${taskId}`,
          isAssigned: false,
          loadState: "ready",
          lastValue: null,
          samples: [],
          max: 1,
          loss: null,
          buckets: buildPingBuckets({ samples: [] }, pingBucketCount, bucketNow),
        };
        return unassigned;
      })
      .filter((line): line is HomepagePingDisplayLine => line != null);
  }, [
    bucketNow,
    homepageMultiPingNodeTaskIds,
    homepageMultiPingTaskIds,
    localLineOverrides,
    multiPingActive,
    offlineSince,
    pingBucketCount,
    pingTaskNames,
    realPingLines,
    uuid,
  ]);

  const metaModel = useMemo(() => {
    if (!meta) return null;
    const tags = parseTags(meta.tags);
    const group = showCardGroup ? meta.group : undefined;
    const subtitleParts = [group, meta.public_remark]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part));
    const subtitleLabels = new Set(subtitleParts.map((part) => part.toLowerCase()));
    const compactFooterTags = tags.filter(
      (tag) => !subtitleLabels.has(tag.label.trim().toLowerCase()),
    );
    const fallbackFooterTags =
      tags.length > 0
        ? tags
        : group
          ? [{ label: group, color: "gray" }]
          : [];
    return {
      tags,
      footerTags: fallbackFooterTags,
      compactFooterTags,
      subtitle: joinDisplayParts(subtitleParts),
      expire: formatExpireDays(meta.expired_at, now),
      expireColor: getExpireTextColor(meta.expired_at, now),
      trafficReset: getTrafficResetDisplay(meta.expired_at, now),
      // 「卡片显示价格」只作用于大卡片（NodeCard 自己收敛）；小卡片等布局照旧显示。
      showCardPrice,
      renewalPrice: formatRenewalPrice(meta),
      osName: resolveOsInfo(meta.os).name,
      loadBaseline: meta.cpu_cores > 0 ? meta.cpu_cores : 4,
    };
  }, [meta, now, showCardGroup, showCardPrice]);

  // ping 派生的颜色只在 ping item 变化时才变。
  const pingModel = useMemo(
    () => ({
      latencyColor: latencyHeatColor(ping.lastValue),
      lossColor: lossHeatColor(ping.loss),
      hasRealHomepagePingBinding,
      // 保留旧字段供外部模型消费者兼容；它表示后台当前分配状态。
      hasHomepagePingBinding: hasRealHomepagePingBinding,
      shouldRenderPingBars,
      pingLoading,
      pingError,
    }),
    [
      hasRealHomepagePingBinding,
      ping,
      pingError,
      pingLoading,
      shouldRenderPingBars,
    ],
  );

  return useMemo(() => {
    if (!meta || !metrics || !metaModel) {
      return {
        node: undefined,
        trafficTrend,
        ping,
        pingBuckets,
        homepagePingLines,
        multiPingActive,
      };
    }

    const { loadBaseline } = metaModel;

    // 流量配额：按节点的 traffic_limit_type（与后端一致）把累计上/下行算成"已用"，
    // 在这里一次性算出剩余和使用占比，让两种卡片布局共用这套计算。
    const trafficUsage = resolveTrafficUsage(
      meta.traffic_limit_type,
      metrics.trafficUp,
      metrics.trafficDown,
      meta.traffic_limit,
    );
    const trafficUsedLabel = formatBytes(trafficUsage.used);
    // 不限量时渲染成 ∞，让剩余值和"已用/上限"那行与限量情况保持一致
    //（"剩余 ∞" + "2.73 GB / ∞"）。
    const trafficLimitLabel = trafficUsage.unlimited ? "∞" : formatBytes(trafficUsage.limit);
    const trafficColor = trafficUsage.unlimited
      ? "var(--status-success)"
      : trafficUsageColor(trafficUsage.fraction);
    const traffic: TrafficDisplay = {
      fraction: trafficUsage.fraction,
      color: trafficColor,
      remainingLabel: trafficUsage.unlimited ? "∞" : formatBytes(trafficUsage.remaining),
      detail: `${trafficUsedLabel} / ${trafficLimitLabel}`,
      typeLabel: trafficTypeLabel(meta.traffic_limit_type),
    };

    return {
      node: { ...meta, ...metrics },
      trafficTrend,
      ping,
      pingBuckets,
      homepagePingLines,
      multiPingActive,
      traffic,
      ...metaModel,
      ...pingModel,
      uptime: formatUptimeDays(metrics.uptime),
      loadFraction: Math.max(0, Math.min(1, metrics.load1 / loadBaseline)),
      upRate: formatByteRate(metrics.netUp),
      downRate: formatByteRate(metrics.netDown),
      isOnline: metrics.online === true,
      isOffline: metrics.online === false,
    };
  }, [
    homepagePingLines,
    multiPingActive,
    meta,
    metrics,
    metaModel,
    pingModel,
    ping,
    pingBuckets,
    trafficTrend,
  ]);
}
