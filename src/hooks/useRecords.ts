import { useQuery } from "@tanstack/react-query";
import { getLoadRecords, getPingRecords } from "@/services/api";

const RECORD_QUERY_OPTIONS = {
  staleTime: 300_000,
  // 详情页 5 分钟内重进时必须重新拉取,否则图表停留在上一次的窗口;
  // requestHistory 的共享缓存会把并发请求合并成一次,不会真的多打。
  refetchOnMount: "always",
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

export function useLoadRecords(uuid: string, hours = 6, enabled = true) {
  return useQuery({
    queryKey: ["records", "load", uuid, hours],
    queryFn: ({ signal }) => getLoadRecords(uuid, hours, { signal }),
    ...RECORD_QUERY_OPTIONS,
    enabled: Boolean(uuid) && enabled,
  });
}

// stats 已并入 getPingRecords 的同一次请求(response.stats),不再单独发起查询。
export function usePingRecords(uuid: string, hours = 6, enabled = true) {
  return useQuery({
    queryKey: ["records", "ping", uuid, hours],
    queryFn: ({ signal }) => getPingRecords(uuid, hours, { signal }),
    ...RECORD_QUERY_OPTIONS,
    enabled: Boolean(uuid) && enabled,
  });
}
