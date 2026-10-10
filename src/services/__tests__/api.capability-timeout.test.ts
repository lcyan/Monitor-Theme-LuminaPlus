import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdminPingTasks } from "@/services/api";

afterEach(() => vi.unstubAllGlobals());

describe("monitor probe task adapter", () => {
  it("reads probe assignments from node history", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((input: string) => {
      if (input === "/api/nodes") {
        return Promise.resolve(new Response(JSON.stringify({ nodes: [{ id: 2 }, { id: 8 }] }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ probes: { "4": "Origin" }, ping: [] }), { status: 200 }));
    }));

    await expect(getAdminPingTasks()).resolves.toEqual([
      expect.objectContaining({ id: 4, interval: 60, clients: ["2", "8"] }),
    ]);
  });
});
