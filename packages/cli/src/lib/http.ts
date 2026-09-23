import { debug } from "./output.js";

/** Nothing the CLI talks to should take longer than this. */
const TIMEOUT_MS = Number(process.env.UPLOADX_TIMEOUT_MS ?? 30_000);

/**
 * `fetch` that cannot hang.
 *
 * Without a deadline a stalled connection leaves the CLI sitting silently
 * forever, which is indistinguishable from a bug. This turns it into an error
 * naming the URL.
 */
export async function httpFetch(url: string, init: RequestInit = {}): Promise<Response> {
  debug(`→ ${init.method ?? "GET"} ${url}`);
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    debug(`← ${response.status} ${url}`);
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error(`Timed out after ${TIMEOUT_MS}ms: ${url}`);
    }
    throw error;
  }
}
