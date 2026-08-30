/* Behavioural guard for the service worker.

   Grain Studio previously shipped a cache-first worker that pinned returning
   visitors to the first HTML they ever fetched, so no later release could reach
   them. These tests execute the real public/sw.js in a mock worker scope and
   assert the corrected behaviour, so that regression cannot ship again. */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

type MockResponse = { label: string; ok: boolean; type: string; clone: () => MockResponse };

const makeResponse = (label: string): MockResponse => ({
  label,
  ok: true,
  type: "basic",
  clone: () => makeResponse(label),
});

type WorkerRequest = { url: string; method?: string; mode?: string; destination?: string };

function loadWorker({
  networkFails = false,
  preCached = [] as string[],
  existingCaches = [] as string[],
} = {}) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const fetchCalls: string[] = [];
  const cacheMatchCalls: string[] = [];
  const putCalls: string[] = [];
  const deletedCaches: string[] = [];
  const stored = new Set<string>(preCached);
  const cacheNames = new Set<string>(existingCaches);
  const pending: Promise<unknown>[] = [];

  const keyOf = (request: WorkerRequest | string) => (typeof request === "string" ? request : request.url);

  const cache = {
    addAll: async (items: string[]) => items.forEach((item) => stored.add(item)),
    put: async (request: WorkerRequest | string) => {
      putCalls.push(keyOf(request));
      stored.add(keyOf(request));
    },
  };

  const caches = {
    open: async (name: string) => {
      cacheNames.add(name);
      return cache;
    },
    keys: async () => [...cacheNames],
    delete: async (name: string) => {
      deletedCaches.push(name);
      cacheNames.delete(name);
      return true;
    },
    match: async (request: WorkerRequest | string) => {
      const key = keyOf(request);
      cacheMatchCalls.push(key);
      return stored.has(key) ? makeResponse(`cache:${key}`) : undefined;
    },
  };

  const state = { skipWaiting: false, claimed: false };

  const selfMock = {
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      listeners[type] = handler;
    },
    skipWaiting: () => {
      state.skipWaiting = true;
    },
    clients: {
      claim: async () => {
        state.claimed = true;
      },
    },
    location: { origin: "https://grainstudio.harshith.com" },
  };

  const fetchMock = async (request: WorkerRequest | string) => {
    fetchCalls.push(keyOf(request));
    if (networkFails) throw new Error("offline");
    return makeResponse(`network:${keyOf(request)}`);
  };

  const ResponseMock = { error: () => makeResponse("response-error") };

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const factory = new Function("self", "caches", "fetch", "Response", "URL", source);
  factory(selfMock, caches, fetchMock, ResponseMock, URL);

  const lifecycle = async (type: "install" | "activate") => {
    listeners[type]?.({ waitUntil: (promise: Promise<unknown>) => pending.push(promise) });
    await Promise.all(pending);
  };

  const request = async (input: WorkerRequest) => {
    let responded: Promise<MockResponse> | undefined;
    listeners.fetch?.({
      request: { method: "GET", ...input },
      respondWith: (promise: Promise<MockResponse>) => {
        responded = promise;
      },
    });
    return responded ? await responded : undefined;
  };

  return { lifecycle, request, fetchCalls, cacheMatchCalls, putCalls, deletedCaches, cacheNames, state };
}

const NAVIGATION = { url: "https://grainstudio.harshith.com/", mode: "navigate", destination: "document" };

describe("service worker document handling", () => {
  it("serves navigations from the network first so a new release always reaches returning visitors", async () => {
    const worker = loadWorker({ preCached: ["/"] });
    const response = await worker.request(NAVIGATION);

    expect(response?.label).toBe("network:https://grainstudio.harshith.com/");
    expect(worker.fetchCalls).toHaveLength(1);
    // The critical assertion: the cache is not consulted ahead of the network.
    expect(worker.cacheMatchCalls).toEqual([]);
  });

  it("refreshes the stored offline document on every successful navigation", async () => {
    const worker = loadWorker();
    await worker.request(NAVIGATION);
    expect(worker.putCalls).toEqual(["/"]);
  });

  it("falls back to the cached document only when the network is unavailable", async () => {
    const worker = loadWorker({ networkFails: true, preCached: ["/"] });
    const response = await worker.request(NAVIGATION);

    expect(worker.fetchCalls).toHaveLength(1);
    expect(response?.label).toBe("cache:/");
  });

  it("returns an error response when offline with nothing cached", async () => {
    const worker = loadWorker({ networkFails: true });
    const response = await worker.request(NAVIGATION);
    expect(response?.label).toBe("response-error");
  });
});

describe("service worker asset handling", () => {
  it("serves content-hashed assets from cache without hitting the network", async () => {
    const asset = "https://grainstudio.harshith.com/assets/index-abc123.js";
    const worker = loadWorker({ preCached: [asset] });
    const response = await worker.request({ url: asset, destination: "script" });

    expect(response?.label).toBe(`cache:${asset}`);
    expect(worker.fetchCalls).toEqual([]);
  });

  it("ignores cross-origin and non-GET requests entirely", async () => {
    const worker = loadWorker();
    expect(await worker.request({ url: "https://signal.harshith.com/i/v0/e/", method: "POST" })).toBeUndefined();
    expect(await worker.request({ url: "https://fonts.example.com/x.woff2" })).toBeUndefined();
    expect(worker.fetchCalls).toEqual([]);
  });
});

describe("service worker lifecycle", () => {
  it("evicts the legacy grain-studio-v1 cache on activation", async () => {
    const worker = loadWorker({ existingCaches: ["grain-studio-v1", "grain-studio-v2"] });
    await worker.lifecycle("activate");

    expect(worker.deletedCaches).toContain("grain-studio-v1");
    expect(worker.deletedCaches).not.toContain("grain-studio-v2");
    expect(worker.state.claimed).toBe(true);
  });

  it("takes over immediately on install so the fix applies without a second visit", async () => {
    const worker = loadWorker();
    await worker.lifecycle("install");
    expect(worker.state.skipWaiting).toBe(true);
  });

  it("uses a versioned cache name that is no longer v1", () => {
    expect(source).toMatch(/const CACHE_VERSION = "v[2-9]\d*"/);
    expect(source).toContain("grain-studio-${CACHE_VERSION}");
  });
});
