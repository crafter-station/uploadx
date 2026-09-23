import * as prompts from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { createClient } from "../lib/api.js";
import {
  CliError,
  formatBytes,
  info,
  isInteractive,
  printJson,
  success,
  table,
} from "../lib/output.js";
import { type App, listApps, resolveAppId } from "../lib/target.js";

export function registerAppCommands(program: Command): void {
  const apps = program.command("apps").description("Manage apps");

  apps
    .command("list")
    .alias("ls")
    .description("List apps in the current organization")
    .option("-p, --profile <name>", "profile to use")
    .option("--json", "output JSON")
    .action(list);

  apps
    .command("create [name]")
    .description("Create an app and its storage bucket")
    .option("-p, --profile <name>", "profile to use")
    .option("--storage-limit <bytes>", "storage limit in bytes")
    .option("--json", "output JSON")
    .action(create);

  apps
    .command("delete [appId]")
    .description("Delete an app, its bucket, tokens and file metadata")
    .option("-p, --profile <name>", "profile to use")
    .option("-y, --yes", "skip confirmation")
    .option("--json", "output JSON")
    .action(remove);
}

async function list(options: { profile?: string; json?: boolean }): Promise<void> {
  const client = await createClient({ profile: options.profile });
  const apps = await listApps(client);

  if (options.json) return printJson({ apps });

  if (apps.length === 0) {
    info("No apps yet — create one with `uploadx apps create`.");
    return;
  }

  info(
    table(
      ["ID", "NAME", "BUCKET", "LIMIT"],
      apps.map((app) => [
        app.id,
        app.name,
        app.bucketName,
        app.storageLimit ? formatBytes(app.storageLimit) : "unlimited",
      ]),
    ),
  );
}

async function create(
  name: string | undefined,
  options: { profile?: string; storageLimit?: string; json?: boolean },
): Promise<void> {
  const client = await createClient({ profile: options.profile });

  let appName = name;
  if (!appName) {
    if (!isInteractive(options.json)) {
      throw new CliError("An app name is required: `uploadx apps create <name>`");
    }
    const answer = await prompts.text({
      message: "App name",
      validate: (value) => (value.trim() ? undefined : "A name is required"),
    });
    if (prompts.isCancel(answer)) throw new CliError("Cancelled", 130);
    appName = String(answer);
  }

  const app = await client.request<App>("POST", "/api/apps", {
    name: appName,
    storageLimit: options.storageLimit ? Number(options.storageLimit) : null,
  });

  if (options.json) return printJson(app);
  success(`Created ${pc.bold(app.name)} — ${pc.dim(app.id)}`);
}

async function remove(
  appId: string | undefined,
  options: { profile?: string; yes?: boolean; json?: boolean },
): Promise<void> {
  const client = await createClient({ profile: options.profile });
  const id = appId ?? (await resolveAppId(client, { json: options.json }));

  const { app } = await client.request<{ app: App }>("GET", `/api/apps?appId=${id}`);

  if (!options.yes) {
    if (!isInteractive(options.json)) {
      throw new CliError("Refusing to delete without --yes when not interactive");
    }

    const typed = await prompts.text({
      message: `Deleting ${app.name} erases its bucket and every file. Type the app name to confirm`,
    });
    if (prompts.isCancel(typed)) throw new CliError("Cancelled", 130);
    if (String(typed) !== app.name) throw new CliError("Name did not match — nothing deleted");
  }

  await client.request("DELETE", "/api/apps", { appId: id });

  if (options.json) return printJson({ success: true, appId: id });
  success(`Deleted ${pc.bold(app.name)}`);
}
