import * as prompts from "@clack/prompts";
import type { Client } from "./api.js";
import { findLink } from "./link.js";
import { CliError, isInteractive } from "./output.js";

export interface App {
  id: string;
  name: string;
  bucketName: string;
  storageLimit: number | null;
  createdAt: string;
}

export type AppSource =
  | { kind: "value"; appId: string; from: "flag" | "env" | "link" }
  | { kind: "prompt" };

/**
 * Decide where the target app id comes from, without touching the network.
 *
 * Precedence is `--app`, then `UPLOADX_APP_ID`, then the nearest `.uploadx.json`,
 * and only then an interactive picker.
 */
export function pickAppSource(input: {
  flag?: string;
  env?: string;
  linked?: string;
}): AppSource {
  if (input.flag) return { kind: "value", appId: input.flag, from: "flag" };
  if (input.env) return { kind: "value", appId: input.env, from: "env" };
  if (input.linked) return { kind: "value", appId: input.linked, from: "link" };
  return { kind: "prompt" };
}

export async function listApps(client: Client): Promise<App[]> {
  const { apps } = await client.request<{ apps: App[] }>("GET", "/api/apps");
  return apps;
}

/**
 * Resolve which app a command acts on.
 */
export async function resolveAppId(
  client: Client,
  options: { app?: string; json?: boolean } = {},
): Promise<string> {
  const link = await findLink();
  const source = pickAppSource({
    flag: options.app,
    env: process.env.UPLOADX_APP_ID,
    linked: link?.link.appId,
  });

  if (source.kind === "value") return source.appId;

  if (!isInteractive(options.json)) {
    throw new CliError(
      "No app selected. Pass --app <id>, set UPLOADX_APP_ID, or run `uploadx link`.",
    );
  }

  const apps = await listApps(client);
  if (apps.length === 0) {
    throw new CliError("No apps yet — create one with `uploadx apps create`.");
  }
  if (apps.length === 1 && apps[0]) return apps[0].id;

  const choice = await prompts.select({
    message: "Which app?",
    options: apps.map((app) => ({ value: app.id, label: app.name, hint: app.bucketName })),
  });

  if (prompts.isCancel(choice)) throw new CliError("Cancelled", 130);
  return choice as string;
}
