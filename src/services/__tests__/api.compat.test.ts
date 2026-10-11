import { afterEach, describe, expect, it, vi } from "vitest";
import { getLoadRecords, getNodes, getNodesLatestStatus, normalizePingHistory } from "@/services/api";

afterEach(() => vi.unstubAllGlobals());

describe("monitor node snapshot cache", () => {
  it("does not let an older concurrent response replace a newer snapshot", async () => {
    let resolveFirst!: (response: Response) => void;
    let resolveSecond!: (response: Response) => void;
    let requestCount = 0;
    const firstResponse = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const secondResponse = new Promise<Response>((resolve) => { resolveSecond = resolve; });
    const fetchMock = vi.fn(() => {
      requestCount += 1;
      return requestCount === 1 ? firstResponse : secondResponse;
    });
    vi.stubGlobal("fetch", fetchMock);

    const olderRequest = getNodes();
    await Promise.resolve();
    const newerRequest = getNodes();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolveSecond(new Response(JSON.stringify({ nodes: [{ id: 2, name: "new" }] }), { status: 200 }));
    await newerRequest;
    resolveFirst(new Response(JSON.stringify({ nodes: [{ id: 1, name: "old" }] }), { status: 200 }));
    await olderRequest;

    await expect(getNodesLatestStatus()).resolves.toEqual({
      "2": expect.objectContaining({ online: false }),
    });
  });
});

describe("monitor Ping history adapter", () => {
  it("preserves probe labels, inferred intervals and packet loss", () => {
    const result = normalizePingHistory("9", 4, {
      probes: { "2": "Cloudflare" },
      ping: [
        { task_id: 2, ts: 1_700_000_000, latency: 24, loss: 0 },
        { task_id: 2, ts: 1_700_000_060, latency: null, loss: 100 },
      ],
    });

    expect(result.tasks).toEqual([
      expect.objectContaining({ id: 2, name: "Cloudflare", clients: ["9"], interval: 60 }),
    ]);
    expect(result.records).toEqual([
      expect.objectContaining({ client: "9", value: 24, loss: 0 }),
      expect.objectContaining({ client: "9", value: -1, loss: 100 }),
    ]);
    expect(result.intervalSeconds).toBe(60);
  });

  it("surfaces the window loss instead of leaving it to per-bucket averages (regression)", () => {
    // monitor 的逐桶 loss 是桶内百分比(分母已经丢了),窗口丢包率只在顶层 loss 里;
    // 主题以前自己平均逐桶值,于是「180 次里丢 1 次」被算成 0%。
    const result = normalizePingHistory("9", 4, {
      probes: { 2: "Cloudflare" },
      loss: { 2: 0.56 },
      ping: [
        { task_id: 2, ts: 1_700_000_000, latency: 24, loss: 1 },
        { task_id: 2, ts: 1_700_000_060, latency: 25 },
      ],
    });

    expect(result.windowLoss).toEqual({ 2: 0.56 });
    expect(result.tasks[0]).toMatchObject({ id: 2, loss: 0.56 });
  });

  it("retains a backend-assigned probe before its first sample arrives", () => {
    const result = normalizePingHistory("9", 1, {
      probes: { "2": "Cloudflare", "3": "Backup" },
      ping: [{ task_id: 2, ts: 1_700_000_000, latency: 24 }],
    });

    expect(result.tasks).toEqual([
      expect.objectContaining({ id: 2, clients: ["9"] }),
      expect.objectContaining({ id: 3, name: "Backup", clients: ["9"] }),
    ]);
    expect(result.records).toHaveLength(1);
  });

  it("does not treat an old sample as a currently assigned task", () => {
    const result = normalizePingHistory("9", 1, {
      probes: { "2": "Google" },
      ping: [
        { task_id: 1, ts: 1_700_000_000, latency: 40 },
        { task_id: 2, ts: 1_700_000_060, latency: 50 },
      ],
    });
    expect(result.tasks.map((task) => task.id)).toEqual([2]);
  });
});

describe("monitor resource history adapter", () => {
  it("maps resource fields added by monitor 1.4.1", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      metrics: [{
        ts: 1_700_000_000,
        swap_used: 128,
        tcp: 12,
        udp: 4,
        procs: 88,
      }],
    }), { status: 200 })));

    const result = await getLoadRecords("9", 4);
    expect(result.records[0]).toMatchObject({
      swap: 128,
      connections: 12,
      connections_udp: 4,
      process: 88,
      history_capabilities: {
        swap: true,
        connections: true,
        process: true,
      },
    });
  });

  it("marks fields omitted by monitor so charts do not draw fake zero values", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      metrics: [{ ts: 1_700_000_000, cpu: 12, mem_used: 512, disk_used: 2048, net_rx: 20, net_tx: 10 }],
    }), { status: 200 })));

    const result = await getLoadRecords("9", 4);
    expect(result.records[0]).toMatchObject({
      cpu: 12,
      history_capabilities: {
        swap: false,
        trafficTotals: false,
        connections: false,
        process: false,
        load: false,
      },
    });
  });
});
