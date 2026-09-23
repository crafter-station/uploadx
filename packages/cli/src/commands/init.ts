import { appendFile, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import * as prompts from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { type Client, createClient } from "../lib/api.js";
import { findLink, writeLink } from "../lib/link.js";
import { CliError, info, isInteractive, success, warn } from "../lib/output.js";
import { type App, listApps, resolveAppId } from "../lib/target.js";

export function registerInitCommands(program: Command): void {
  program
    .command("init")
    .description("Wire up the current project: app, token, .env.local and route handlers")
    .option("-p, --profile <name>", "profile to use")
    .option("-a, --app <id>", "use an existing app instead of prompting")
    .option("--no-scaffold", "skip writing source files")
    .action(init);

  program
    .command("link")
    .description("Record which app this directory belongs to")
    .option("-p, --profile <name>", "profile to use")
    .option("-a, --app <id>", "app id")
    .action(link);
}

async function link(options: { profile?: string; app?: string }): Promise<void> {
  const client = await createClient({ profile: options.profile });
  const appId = await resolveAppId(client, options);
  const path = await writeLink(process.cwd(), { appId });
  success(`Linked this directory to ${pc.dim(appId)} — wrote ${pc.bold(path)}`);
}

async function init(options: {
  profile?: string;
  app?: string;
  scaffold: boolean;
}): Promise<void> {
  const client = await createClient({ profile: options.profile });
  const touched: string[] = [];

  const app = await chooseOrCreateApp(client, options.app);

  // 1. Link the directory.
  const existingLink = await findLink(process.cwd());
  if (existingLink && existingLink.link.appId !== app.id) {
    warn(`${existingLink.path} already points at ${existingLink.link.appId} — leaving it alone`);
  } else {
    touched.push(await writeLink(process.cwd(), { appId: app.id }));
  }

  // 2. Environment. Never clobber an existing token.
  const envPath = join(process.cwd(), ".env.local");
  const env = await readFile(envPath, "utf8").catch(() => "");

  if (env.includes("UPLOADX_TOKEN=")) {
    warn(".env.local already defines UPLOADX_TOKEN — leaving it alone");
  } else {
    const { token } = await client.request<{ token: string }>("POST", "/api/tokens", {
      appId: app.id,
      name: `CLI ${hostname()}`,
    });
    const prefix = env && !env.endsWith("\n") ? "\n" : "";
    await appendFile(envPath, `${prefix}UPLOADX_TOKEN=${token}\nUPLOADX_URL=${client.url}\n`);
    touched.push(envPath);
  }

  // 3. Optional Next.js scaffolding.
  if (options.scaffold) {
    touched.push(...(await scaffoldNext()));
  }

  info("");
  success(`Ready — app ${pc.bold(app.name)}`);
  for (const path of touched) info(`  ${pc.dim("wrote")} ${path}`);
  if (touched.some((p) => p.endsWith(".env.local"))) {
    info(`  ${pc.dim("note")} .env.local holds a secret — keep it out of git`);
  }
}

function hostname(): string {
  return process.env.HOSTNAME ?? process.env.COMPUTERNAME ?? "cli";
}

async function chooseOrCreateApp(client: Client, appId: string | undefined): Promise<App> {
  if (appId) {
    const { app } = await client.request<{ app: App }>("GET", `/api/apps?appId=${appId}`);
    return app;
  }

  const apps = await listApps(client);

  if (apps.length > 0 && isInteractive()) {
    const choice = await prompts.select({
      message: "Which app should this project use?",
      options: [
        ...apps.map((app) => ({ value: app.id, label: app.name, hint: app.bucketName })),
        { value: "__new__", label: "Create a new app" },
      ],
    });
    if (prompts.isCancel(choice)) throw new CliError("Cancelled", 130);
    if (choice !== "__new__") {
      const picked = apps.find((a) => a.id === choice);
      if (picked) return picked;
    }
  } else if (apps.length > 0) {
    const id = await resolveAppId(client, {});
    const { app } = await client.request<{ app: App }>("GET", `/api/apps?appId=${id}`);
    return app;
  }

  if (!isInteractive()) {
    throw new CliError("No app to use. Pass --app <id>, or run `uploadx apps create <name>`.");
  }

  const name = await prompts.text({
    message: "New app name",
    validate: (value) => (value.trim() ? undefined : "A name is required"),
  });
  if (prompts.isCancel(name)) throw new CliError("Cancelled", 130);

  return client.request<App>("POST", "/api/apps", { name: String(name), storageLimit: null });
}

const ROUTER_SOURCE = `import { createUploadx } from "@uploadx-sdk/core/server";
import type { FileRouter } from "@uploadx-sdk/core/server";

const f = createUploadx();

export const fileRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 5 } })
    .onUploadComplete(({ file }) => {
      console.log("Uploaded:", file.name);
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;
`;

const ROUTE_SOURCE = `import { createNextRouteHandler } from "@uploadx-sdk/core/next";
import { fileRouter } from "@/lib/uploadx";

export const { GET, POST } = createNextRouteHandler({ router: fileRouter });
`;

const SERVE_SOURCE = `import { createNextFileServeHandler } from "@uploadx-sdk/core/next";

export const { GET } = createNextFileServeHandler();
`;

/**
 * Write the Next.js wiring, skipping anything that already exists.
 */
async function scaffoldNext(): Promise<string[]> {
  const hasNext = await readFile(join(process.cwd(), "package.json"), "utf8")
    .then((raw) => raw.includes('"next"'))
    .catch(() => false);

  if (!hasNext) return [];

  const targets = [
    { path: join(process.cwd(), "src", "lib", "uploadx.ts"), source: ROUTER_SOURCE },
    { path: join(process.cwd(), "src", "app", "api", "uploadx", "route.ts"), source: ROUTE_SOURCE },
    {
      path: join(process.cwd(), "src", "app", "api", "uploadx", "f", "[...key]", "route.ts"),
      source: SERVE_SOURCE,
    },
  ];

  const written: string[] = [];

  for (const target of targets) {
    const exists = await readFile(target.path, "utf8").then(
      () => true,
      () => false,
    );
    if (exists) {
      warn(`${target.path} already exists — leaving it alone`);
      continue;
    }
    const { mkdir } = await import("node:fs/promises");
    await mkdir(dirname(target.path), { recursive: true });
    await writeFile(target.path, target.source);
    written.push(target.path);
  }

  return written;
}
