import { ServerError } from "@apollo/client/errors";

// React Native, Chrome, Safari and Firefox word a failed fetch differently
const FETCH_FAILURES = new Set([
  "Network request failed",
  "Failed to fetch",
  "Load failed",
  "NetworkError when attempting to fetch resource.",
]);

/** No server answered: what `fetchOrNetworkError` turns a rejected fetch into. */
export class NetworkError extends Error {
  name = "NetworkError";
}

/**
 * A link that's up but carries nothing (no signal, a captive portal) never
 * settles a fetch: without a limit nothing ever reads as offline.
 */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * fetch for Apollo's HttpLink. An HTTP error resolves, so a rejection means no
 * server answered; expo/fetch rejects with its own FetchError ("fetch failed:
 * …UnknownHostException") that names nothing a check could rely on. No
 * response within `timeoutMs` counts as no answer too.
 */
function fetchWithin(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  // React Native has no AbortSignal.any or AbortSignal.timeout.
  const controller = new AbortController();
  const caller = init?.signal;
  const forward = () => controller.abort();
  if (caller?.aborted) controller.abort();
  else caller?.addEventListener("abort", forward);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  return fetch(input, { ...init, signal: controller.signal })
    .catch((error: unknown) => {
      if (timedOut)
        throw new NetworkError(`No answer in ${timeoutMs / 1000}s`, {
          cause: error,
        });
      if (caller?.aborted) throw error;
      throw new NetworkError(
        error instanceof Error ? error.message : String(error),
        { cause: error },
      );
    })
    .finally(() => {
      clearTimeout(timer);
      caller?.removeEventListener("abort", forward);
    });
}

// Cast: `typeof fetch` also carries Bun's `preconnect` in this repo's types.
export const fetchOrNetworkError = fetchWithin as typeof fetch &
  typeof fetchWithin;

/** A dropped connection, not an answer from the server (GraphQL or HTTP error). */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof TypeError) return FETCH_FAILURES.has(error.message);
  return typeof error === "object" && error !== null && "networkError" in error;
}

/**
 * Worth sending again later: no answer, AniList's rate limit, or its server
 * failing. Anything else (a refused change) would fail the same way again.
 */
export function isTransient(error: unknown): boolean {
  if (isNetworkError(error)) return true;
  if (!ServerError.is(error)) return false;
  return error.statusCode === 429 || error.statusCode >= 500;
}

const RATE_LIMIT_WAIT_MS = 60_000;

/** How long AniList asks to wait after its rate limit; undefined for any other error. */
export function rateLimitWait(error: unknown): number | undefined {
  if (!ServerError.is(error) || error.statusCode !== 429) return;
  const seconds = Number(error.response.headers.get("Retry-After"));
  return seconds > 0 ? seconds * 1000 : RATE_LIMIT_WAIT_MS;
}

/**
 * Whether the error link toasts a failure: not when the operation asks for
 * silence, nor when only the connection dropped and a query can wait, nor
 * when a mutation keeps its work for later (`queueOffline`) and the failure
 * is one a later send can get past.
 */
export function shouldToast(
  context: Readonly<Record<string, unknown>>,
  error: unknown,
  isQuery: boolean,
): boolean {
  if (context.silent) return false;
  if (isQuery) return !isNetworkError(error);
  return !(context.queueOffline && isTransient(error));
}
