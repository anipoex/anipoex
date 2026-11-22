import { afterEach, describe, expect, it } from "bun:test";
import { CombinedGraphQLErrors, ServerError } from "@apollo/client/errors";
import {
  fetchOrNetworkError,
  isNetworkError,
  isTransient,
  NetworkError,
  rateLimitWait,
  shouldToast,
} from "./utils";

const offline = new TypeError("Network request failed");
const denied = new CombinedGraphQLErrors({ errors: [{ message: "Denied" }] });
const status = (code: number, headers?: Record<string, string>) =>
  new ServerError("x", {
    response: new Response("", { status: code, headers }),
    bodyText: "",
  });

describe("isNetworkError", () => {
  it("is true for a dropped connection", () => {
    expect(isNetworkError(offline)).toBe(true);
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new TypeError("Load failed"))).toBe(true);
    expect(
      isNetworkError(
        new TypeError("NetworkError when attempting to fetch resource."),
      ),
    ).toBe(true);
    expect(isNetworkError({ networkError: new Error("x") })).toBe(true);
  });

  it("is false for an answer from the server", () => {
    expect(isNetworkError(denied)).toBe(false);
    expect(
      isNetworkError(
        new ServerError("down", {
          response: new Response("", { status: 503 }),
          bodyText: "",
        }),
      ),
    ).toBe(false);
    expect(isNetworkError(new Error("other"))).toBe(false);
    expect(isNetworkError(new TypeError("x is not a function"))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });
});

describe("isTransient", () => {
  it("is true for what a later send can get past", () => {
    expect(isTransient(offline)).toBe(true);
    expect(isTransient(status(429))).toBe(true);
    expect(isTransient(status(503))).toBe(true);
  });

  it("is false for a refused change", () => {
    expect(isTransient(denied)).toBe(false);
    expect(isTransient(status(400))).toBe(false);
    expect(isTransient(status(401))).toBe(false);
  });
});

describe("rateLimitWait", () => {
  it("reads Retry-After, or waits a minute without it", () => {
    expect(rateLimitWait(status(429, { "Retry-After": "30" }))).toBe(30_000);
    expect(rateLimitWait(status(429))).toBe(60_000);
  });

  it("is undefined for anything but the rate limit", () => {
    expect(rateLimitWait(status(503))).toBeUndefined();
    expect(rateLimitWait(offline)).toBeUndefined();
  });
});

describe("shouldToast", () => {
  it("a query that lost the connection stays quiet", () => {
    expect(shouldToast({}, offline, true)).toBe(false);
  });

  it("a mutation that lost the connection toasts unless it queues", () => {
    expect(shouldToast({}, offline, false)).toBe(true);
    expect(shouldToast({ queueOffline: true }, offline, false)).toBe(false);
  });

  it("a mutation that queues stays quiet when AniList is busy", () => {
    expect(shouldToast({ queueOffline: true }, status(429), false)).toBe(false);
    expect(shouldToast({}, status(429), false)).toBe(true);
    expect(shouldToast({}, status(503), true)).toBe(true);
  });

  it("an answer with errors still toasts", () => {
    expect(shouldToast({}, denied, true)).toBe(true);
    expect(shouldToast({ queueOffline: true }, denied, false)).toBe(true);
    expect(shouldToast({ silent: true }, denied, true)).toBe(false);
  });
});

describe("fetchOrNetworkError", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("turns a rejected fetch into a NetworkError", async () => {
    // expo/fetch's own error on Android, which matches no TypeError message
    const native = new Error(
      'fetch failed: java.net.UnknownHostException: Unable to resolve host "example.com"',
    );
    globalThis.fetch = (() =>
      Promise.reject(native)) as unknown as typeof fetch;
    const error = await fetchOrNetworkError("https://example.com").catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).cause).toBe(native);
    expect(isNetworkError(error)).toBe(true);
  });

  it("keeps an abort as it is", async () => {
    const aborted = new Error("The operation was aborted.");
    globalThis.fetch = (() =>
      Promise.reject(aborted)) as unknown as typeof fetch;
    const controller = new AbortController();
    controller.abort();
    const error = await fetchOrNetworkError("https://example.com", {
      signal: controller.signal,
    }).catch((e: unknown) => e);
    expect(error).toBe(aborted);
  });

  it("gives up on a fetch that never answers", async () => {
    let signal: AbortSignal | undefined;
    globalThis.fetch = ((_: unknown, init?: RequestInit) =>
      new Promise((_, reject) => {
        signal = init?.signal ?? undefined;
        signal?.addEventListener("abort", () =>
          reject(new Error("The operation was aborted.")),
        );
      })) as unknown as typeof fetch;
    const error = await fetchOrNetworkError(
      "https://example.com",
      undefined,
      10,
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect(signal?.aborted).toBe(true);
  });

  it("passes the caller's abort on to the fetch", async () => {
    let signal: AbortSignal | undefined;
    globalThis.fetch = ((_: unknown, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise(() => {});
    }) as unknown as typeof fetch;
    const controller = new AbortController();
    void fetchOrNetworkError("https://example.com", {
      signal: controller.signal,
    }).catch(() => {});
    controller.abort();
    expect(signal?.aborted).toBe(true);
  });

  it("passes an HTTP error response through", async () => {
    const response = new Response("", { status: 503 });
    globalThis.fetch = (() =>
      Promise.resolve(response)) as unknown as typeof fetch;
    expect(await fetchOrNetworkError("https://example.com")).toBe(response);
  });
});
