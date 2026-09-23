import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** The hosted instance a fresh profile points at. */
export const DEFAULT_URL = "https://uploadx.crafter.run";

export const DEFAULT_PROFILE = "default";

export interface ProfileAuth {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch milliseconds. */
  expiresAt: number;
  userId: string;
  orgId: string;
  orgSlug: string | null;
}

export interface Profile {
  url: string;
  auth: ProfileAuth;
}

export interface Config {
  version: 1;
  defaultProfile: string;
  profiles: Record<string, Profile>;
}

const EMPTY: Config = { version: 1, defaultProfile: DEFAULT_PROFILE, profiles: {} };

export function configPath(): string {
  return process.env.UPLOADX_CONFIG ?? join(homedir(), ".uploadx", "config.json");
}

/**
 * Which profile a command should use.
 *
 * An explicit flag wins, then `UPLOADX_PROFILE`, then whichever profile the
 * config file marks as the default.
 */
export function resolveProfileName(flag: string | undefined, config: Config): string {
  // Empty means unset: an exported-but-blank UPLOADX_PROFILE must not win.
  return (
    flag?.trim() || process.env.UPLOADX_PROFILE?.trim() || config.defaultProfile || DEFAULT_PROFILE
  );
}

export async function readConfig(): Promise<Config> {
  try {
    const raw = await readFile(configPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<Config>;
    return {
      version: 1,
      defaultProfile: parsed.defaultProfile ?? DEFAULT_PROFILE,
      profiles: parsed.profiles ?? {},
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...EMPTY };
    throw error;
  }
}

export async function writeConfig(config: Config): Promise<void> {
  const path = configPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  // writeFile only applies `mode` when creating the file.
  await chmod(path, 0o600).catch(() => {});
}

export async function saveProfile(name: string, profile: Profile): Promise<void> {
  const config = await readConfig();
  config.profiles[name] = profile;
  if (!config.profiles[config.defaultProfile]) config.defaultProfile = name;
  await writeConfig(config);
}

export async function removeProfile(name: string): Promise<boolean> {
  const config = await readConfig();
  if (!config.profiles[name]) return false;
  delete config.profiles[name];
  if (config.defaultProfile === name) {
    config.defaultProfile = Object.keys(config.profiles)[0] ?? DEFAULT_PROFILE;
  }
  await writeConfig(config);
  return true;
}
