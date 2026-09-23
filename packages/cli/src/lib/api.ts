import {
  type Config,
  DEFAULT_URL,
  type Profile,
  readConfig,
  resolveProfileName,
  saveProfile,
} from "./config.js";
import { refreshTokens } from "./device-flow.js";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NotLoggedInError extends Error {
  constructor(profile: string) {
    super(`Not logged in to profile "${profile}" — run \`uploadx login\``);
    this.name = "NotLoggedInError";
  }
}

export interface InstanceConfig {
  instanceUrl: string;
  clerkFapiUrl: string | null;
  oauthClientId: string | null;
  minCliVersion: string;
  configured: boolean;
}

/** Fetch an instance's public CLI discovery document. */
export async function fetchInstanceConfig(url: string): Promise<InstanceConfig> {
  const response = await fetch(`${url.replace(/\/$/, "")}/api/cli/config`);
  if (!response.ok) {
    throw new Error(`${url} does not look like an UploadX instance (${response.status})`);
  }
  return (await response.json()) as InstanceConfig;
}

export interface Client {
  url: string;
  /** Present for OAuth callers; absent in app-token (CI) mode. */
  orgId: string | null;
  request<T>(method: string, path: string, body?: unknown): Promise<T>;
}

interface ClientOptions {
  profile?: string;
}

/**
 * Build an authenticated client.
 *
 * `UPLOADX_TOKEN` takes precedence: it is the app-scoped SDK token, and the
 * documented way to run app-scoped commands in CI where no browser exists.
 * Otherwise the named profile's OAuth token is used, refreshed if it is close
 * to expiring.
 */
export async function createClient(options: ClientOptions = {}): Promise<Client> {
  const appToken = process.env.UPLOADX_TOKEN;
  if (appToken) {
    const url = process.env.UPLOADX_URL ?? DEFAULT_URL;
    return makeClient(url, appToken, null);
  }

  const config = await readConfig();
  const name = resolveProfileName(options.profile, config);
  const profile = config.profiles[name];
  if (!profile) throw new NotLoggedInError(name);

  const token = await freshAccessToken(name, profile, config);
  return makeClient(profile.url, token, profile.auth.orgId);
}

/** Refresh the profile's access token when it is within a minute of expiry. */
async function freshAccessToken(name: string, profile: Profile, _config: Config): Promise<string> {
  const expiringSoon = profile.auth.expiresAt - Date.now() < 60_000;
  if (!expiringSoon || !profile.auth.refreshToken) return profile.auth.accessToken;

  const instance = await fetchInstanceConfig(profile.url);
  if (!instance.clerkFapiUrl || !instance.oauthClientId) return profile.auth.accessToken;

  const refreshed = await refreshTokens(
    instance.clerkFapiUrl,
    instance.oauthClientId,
    profile.auth.refreshToken,
  );

  await saveProfile(name, {
    ...profile,
    auth: {
      ...profile.auth,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
    },
  });

  return refreshed.accessToken;
}

function makeClient(url: string, token: string, orgId: string | null): Client {
  const base = url.replace(/\/$/, "");

  return {
    url: base,
    orgId,
    async request<T>(method: string, path: string, body?: unknown): Promise<T> {
      const headers: Record<string, string> = { authorization: `Bearer ${token}` };
      if (orgId) headers["x-uploadx-org"] = orgId;
      if (body !== undefined) headers["content-type"] = "application/json";

      const response = await fetch(`${base}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const text = await response.text();
      const data = text ? safeJson(text) : null;

      if (!response.ok) {
        const message =
          (data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : null) ?? `Request failed (${response.status})`;
        throw new ApiError(response.status, message);
      }

      return data as T;
    },
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
