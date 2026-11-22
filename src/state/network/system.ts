import { observe } from "@legendapp/state";
import {
  addNetworkStateListener,
  getNetworkStateAsync,
  type NetworkState,
} from "expo-network";
import { AppState } from "react-native";
import { fetchOrNetworkError, isNetworkError } from "@/graphql/utils";
import { network$, networkAnswered, networkFailed, setSystem } from "./network";

const POLL_MS = 30_000;
// Shorter than a request's: it only asks whether AniList answers at all.
const PING_TIMEOUT_MS = 5_000;
// A drop this short (the screen waking, Wi-Fi handing over) isn't offline,
// and a request that fails meanwhile pings, which decides sooner.
const DROP_GRACE_MS = 5_000;

/** Asks AniList for nothing: any HTTP answer proves the way is open. */
async function check() {
  const url = process.env.EXPO_PUBLIC_ANILIST_GRAPHQL_URL;
  if (!url) return;
  try {
    await fetchOrNetworkError(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: '{"query":"{__typename}"}',
      },
      PING_TIMEOUT_MS,
    );
    networkAnswered();
  } catch (error) {
    if (isNetworkError(error)) networkFailed();
  }
}

let pinging: Promise<void> | undefined;

/** One check at a time: a burst of failed requests shares it. */
export function ping() {
  pinging ??= check().finally(() => {
    pinging = undefined;
  });
  return pinging;
}

let drop: ReturnType<typeof setTimeout> | undefined;

// Android's "no internet" means Google's check failed, which a blocked check
// or some VPNs and private DNS also cause: AniList's answer decides instead.
function apply({ isConnected, isInternetReachable }: NetworkState) {
  if (isConnected === false) {
    drop ??= setTimeout(() => {
      drop = undefined;
      setSystem(false);
    }, DROP_GRACE_MS);
    return;
  }
  clearTimeout(drop);
  drop = undefined;
  const wasConnected = network$.system.peek();
  setSystem(true);
  if (!wasConnected || isInternetReachable === false) void ping();
}

function retry() {
  const { system, reachable } = network$.peek();
  if (AppState.currentState === "active" && system && !reachable) void ping();
}

// The static web render has no `window`, and expo-network reports offline there.
if (typeof window !== "undefined") {
  getNetworkStateAsync().then(apply, () => {});
  addNetworkStateListener(apply);
  setInterval(retry, POLL_MS);
  AppState.addEventListener("change", (state) => {
    if (state === "active") retry();
  });
  if (__DEV__)
    observe(() =>
      console.log(
        `[network] system ${network$.system.get()}, reachable ${network$.reachable.get()}`,
      ),
    );
}
