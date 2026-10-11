import { afterEach, describe, expect, it, vi } from "vitest";
import { installDevMockApi } from "@/dev/mockApi";

afterEach(() => vi.unstubAllGlobals());

describe("development mock API", () => {
  it("still installs when session storage is unavailable", () => {
    const nativeFetch = vi.fn();
    vi.stubGlobal("window", {
      fetch: nativeFetch,
      location: { origin: "http://localhost:5173", search: "?mock=1" },
    } as unknown as Window & typeof globalThis);
    vi.stubGlobal("sessionStorage", {
      setItem: () => { throw new DOMException("Storage is disabled", "SecurityError"); },
      getItem: () => null,
    });

    expect(() => installDevMockApi()).not.toThrow();
  });
});
