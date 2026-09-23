/**
 * OAuth 2.0 Device Authorization Grant (RFC 8628) against a Clerk instance.
 */

export const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";

export const SCOPES = "openid profile email offline_access user:org:read";

/** RFC 8628 §3.2 — the interval to use when the server names none. */
const DEFAULT_INTERVAL_SECONDS = 5;

/** RFC 8628 §3.5 — `slow_down` adds this many seconds, permanently. */
const SLOW_DOWN_INCREMENT_SECONDS = 5;

export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string | null;
  expiresInSeconds: number;
  intervalSeconds: number;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch milliseconds. */
  expiresAt: number;
}

export type PollOutcome =
  | { kind: "token"; token: TokenSet }
  | { kind: "wait"; intervalSeconds: number }
  | { kind: "error"; message: string };

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

/**
 * Decide what a single poll response means.
 *
 * Kept pure and separate from the network so the state machine — particularly
 * that `slow_down` raises the interval permanently rather than pausing once —
 * can be tested directly.
 */
export function interpretPollResponse(
  response: TokenResponse,
  intervalSeconds: number,
  now: number = Date.now(),
): PollOutcome {
  if (response.access_token) {
    return {
      kind: "token",
      token: {
        accessToken: response.access_token,
        refreshToken: response.refresh_token ?? null,
        expiresAt: now + (response.expires_in ?? 3600) * 1000,
      },
    };
  }

  switch (response.error) {
    case "authorization_pending":
      return { kind: "wait", intervalSeconds };
    case "slow_down":
      return { kind: "wait", intervalSeconds: intervalSeconds + SLOW_DOWN_INCREMENT_SECONDS };
    case "access_denied":
      return { kind: "error", message: "Authorization was denied" };
    case "expired_token":
      return { kind: "error", message: "The code expired before it was approved" };
    default:
      return {
        kind: "error",
        message: response.error_description ?? response.error ?? "Authorization failed",
      };
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function postForm(url: string, body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  return (await response.json()) as TokenResponse;
}

/**
 * Ask the instance for a device code the user can approve in a browser.
 */
export async function requestDeviceCode(fapiUrl: string, clientId: string): Promise<DeviceCode> {
  const response = await fetch(`${fapiUrl}/oauth/device_authorization`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, scope: SCOPES }).toString(),
  });

  const data = (await response.json()) as Record<string, unknown> & { error?: string };

  if (!response.ok || !data.device_code) {
    throw new Error(
      `Could not start device authorization: ${data.error ?? response.statusText}. Check that the Clerk OAuth application is public and has the device grant enabled.`,
    );
  }

  return {
    deviceCode: String(data.device_code),
    userCode: String(data.user_code),
    verificationUri: String(data.verification_uri),
    verificationUriComplete: data.verification_uri_complete
      ? String(data.verification_uri_complete)
      : null,
    expiresInSeconds: Number(data.expires_in ?? 600),
    intervalSeconds: Number(data.interval ?? DEFAULT_INTERVAL_SECONDS),
  };
}

/**
 * Poll until the user approves, denies, or the code expires.
 */
export async function pollForToken(
  fapiUrl: string,
  clientId: string,
  device: DeviceCode,
  onTick?: () => void,
): Promise<TokenSet> {
  let intervalSeconds = device.intervalSeconds;
  const deadline = Date.now() + device.expiresInSeconds * 1000;

  while (Date.now() < deadline) {
    await sleep(intervalSeconds * 1000);
    onTick?.();

    const response = await postForm(`${fapiUrl}/oauth/token`, {
      grant_type: DEVICE_GRANT,
      device_code: device.deviceCode,
      client_id: clientId,
    });

    const outcome = interpretPollResponse(response, intervalSeconds);
    if (outcome.kind === "token") return outcome.token;
    if (outcome.kind === "error") throw new Error(outcome.message);
    intervalSeconds = outcome.intervalSeconds;
  }

  throw new Error("The code expired before it was approved");
}

/**
 * Exchange a refresh token for a fresh access token.
 */
export async function refreshTokens(
  fapiUrl: string,
  clientId: string,
  refreshToken: string,
): Promise<TokenSet> {
  const response = await postForm(`${fapiUrl}/oauth/token`, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  if (!response.access_token) {
    throw new Error(response.error_description ?? "Session expired — run `uploadx login` again");
  }

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
  };
}

/**
 * Revoke a token so `logout` actually ends the session. Clerk refresh tokens
 * never expire, so deleting the local file alone would leave access intact.
 */
export async function revokeToken(
  fapiUrl: string,
  clientId: string,
  token: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${fapiUrl}/oauth/token/revoke`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token, client_id: clientId }).toString(),
    });
    return response.ok;
  } catch {
    return false;
  }
}
