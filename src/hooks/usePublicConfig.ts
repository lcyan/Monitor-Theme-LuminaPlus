import { useQuery } from "@tanstack/react-query";
import { getPublic } from "@/services/api";
import type { PublicConfig } from "@/types/models";

export function usePublicConfig() {
  return useQuery<PublicConfig>({
    queryKey: ["public"],
    queryFn: ({ signal }) => getPublic({ signal }),
    staleTime: 60_000,
    refetchInterval: (query) => query.state.data?.theme_settings_error ? 30_000 : false,
  });
}

/**
 * 只在「匿名 → 已登录」的翻转时失效 ["public"]:私有站点匿名时 getPublic 按设计返回空
 * theme_settings,登录后没有任何内建触发器会重拉它(focus/staleTime 都不覆盖)。
 * 首帧就是登录态时不失效——那份配置本来就是带鉴权拉的。prev 由调用方用 ref 维护。
 */
export function shouldInvalidatePublicConfig(previous: boolean, current: boolean): boolean {
  return current && !previous;
}

