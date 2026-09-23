import { readFile, readdir, stat } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import * as prompts from "@clack/prompts";
import type { Command } from "commander";
import pc from "picocolors";
import { createClient } from "../lib/api.js";
import { httpFetch } from "../lib/http.js";
import {
  CliError,
  formatBytes,
  info,
  isInteractive,
  printJson,
  success,
  table,
} from "../lib/output.js";
import { resolveAppId } from "../lib/target.js";

/** How many files upload at once. */
const CONCURRENCY = 4;

interface FileRecord {
  id: string;
  key: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface PresignedUpload {
  key: string;
  name: string;
  presignedUrl: string;
}

export function registerFileCommands(program: Command): void {
  const files = program.command("files").description("Manage uploaded files");

  files
    .command("list")
    .alias("ls")
    .description("List files in an app")
    .option("-a, --app <id>", "app id")
    .option("-p, --profile <name>", "profile to use")
    .option("-s, --search <term>", "filter by name")
    .option("--page <n>", "page number", "1")
    .option("--page-size <n>", "results per page", "20")
    .option("--json", "output JSON")
    .action(list);

  files
    .command("upload <paths...>")
    .description("Upload files or directories")
    .option("-a, --app <id>", "app id")
    .option("-p, --profile <name>", "profile to use")
    .option("-r, --recursive", "walk directories")
    .option("--prefix <prefix>", "key prefix inside the bucket")
    .option("--json", "output JSON")
    .action(upload);

  files
    .command("delete <keys...>")
    .description("Delete files by storage key")
    .option("-a, --app <id>", "app id")
    .option("-p, --profile <name>", "profile to use")
    .option("-y, --yes", "skip confirmation")
    .option("--json", "output JSON")
    .action(remove);
}

async function list(options: {
  app?: string;
  profile?: string;
  search?: string;
  page: string;
  pageSize: string;
  json?: boolean;
}): Promise<void> {
  const client = await createClient({ profile: options.profile });
  const appId = await resolveAppId(client, options);

  const query = new URLSearchParams({
    appId,
    page: options.page,
    pageSize: options.pageSize,
  });
  if (options.search) query.set("search", options.search);

  const result = await client.request<{
    files: FileRecord[];
    pagination: { page: number; totalPages: number; total: number };
  }>("GET", `/api/files?${query}`);

  if (options.json) return printJson(result);

  if (result.files.length === 0) {
    info("No files.");
    return;
  }

  info(
    table(
      ["KEY", "NAME", "SIZE", "UPLOADED"],
      result.files.map((file) => [
        file.key,
        file.name,
        formatBytes(file.size),
        new Date(file.uploadedAt).toISOString().slice(0, 10),
      ]),
    ),
  );
  info(
    pc.dim(
      `\npage ${result.pagination.page}/${result.pagination.totalPages} — ${result.pagination.total} files`,
    ),
  );
}

/** Every file below a directory. Hand-rolled: `readdir`'s `parentPath` needs Node 20.12. */
async function walk(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(path)));
    else if (entry.isFile()) found.push(path);
  }
  return found;
}

/** Expand paths into concrete files, preserving each one's path below its root. */
async function collectFiles(
  paths: string[],
  recursive: boolean,
): Promise<Array<{ absolute: string; relative: string }>> {
  const collected: Array<{ absolute: string; relative: string }> = [];

  for (const input of paths) {
    const absolute = resolve(input);
    const stats = await stat(absolute).catch(() => null);

    if (!stats) throw new CliError(`No such file: ${input}`);

    if (stats.isDirectory()) {
      if (!recursive) {
        throw new CliError(`${input} is a directory — pass --recursive to upload it`);
      }
      for (const entryPath of await walk(absolute)) {
        collected.push({
          absolute: entryPath,
          relative: relative(absolute, entryPath).split(sep).join("/"),
        });
      }
    } else {
      collected.push({ absolute, relative: basename(absolute) });
    }
  }

  return collected;
}

/** Run tasks with a fixed number in flight. */
async function inFlight<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (true) {
      const index = next++;
      const task = tasks[index];
      if (!task) return;
      results[index] = await task();
    }
  });

  await Promise.all(workers);
  return results;
}

async function upload(
  paths: string[],
  options: {
    app?: string;
    profile?: string;
    recursive?: boolean;
    prefix?: string;
    json?: boolean;
  },
): Promise<void> {
  const client = await createClient({ profile: options.profile });
  const appId = await resolveAppId(client, options);
  const found = await collectFiles(paths, Boolean(options.recursive));

  if (found.length === 0) throw new CliError("Nothing to upload");

  const descriptors = await Promise.all(
    found.map(async (file) => {
      const stats = await stat(file.absolute);
      return {
        name: basename(file.absolute),
        path: file.relative,
        size: stats.size,
        type: contentType(file.absolute),
      };
    }),
  );

  const { uploads } = await client.request<{ uploads: PresignedUpload[] }>(
    "POST",
    "/api/files/upload",
    { appId, prefix: options.prefix, files: descriptors },
  );

  let done = 0;
  const spinner = prompts.spinner();
  if (isInteractive(options.json)) spinner.start(`Uploading 0/${uploads.length}`);

  await inFlight(
    uploads.map((target, index) => async () => {
      const source = found[index];
      if (!source) return;
      const body = await readFile(source.absolute);
      const response = await httpFetch(target.presignedUrl, { method: "PUT", body });
      if (!response.ok) {
        throw new CliError(`Upload failed for ${target.name} (${response.status})`);
      }
      done += 1;
      if (isInteractive(options.json)) spinner.message(`Uploading ${done}/${uploads.length}`);
    }),
    CONCURRENCY,
  );

  if (isInteractive(options.json)) spinner.stop(`Uploaded ${done}/${uploads.length}`);

  const { files } = await client.request<{ files: FileRecord[] }>("POST", "/api/files/upload", {
    appId,
    action: "complete",
    files: uploads.map((target, index) => ({
      key: target.key,
      name: target.name,
      size: descriptors[index]?.size ?? 0,
      type: descriptors[index]?.type ?? "application/octet-stream",
    })),
  });

  if (options.json) return printJson({ files });
  for (const file of files) success(`${file.key} ${pc.dim(formatBytes(file.size))}`);
}

async function remove(
  keys: string[],
  options: { app?: string; profile?: string; yes?: boolean; json?: boolean },
): Promise<void> {
  const client = await createClient({ profile: options.profile });
  const appId = await resolveAppId(client, options);

  if (!options.yes) {
    if (!isInteractive(options.json)) {
      throw new CliError("Refusing to delete without --yes when not interactive");
    }
    const confirmed = await prompts.confirm({
      message: `Delete ${keys.length} file${keys.length === 1 ? "" : "s"}?`,
    });
    if (prompts.isCancel(confirmed) || !confirmed) throw new CliError("Cancelled", 130);
  }

  await client.request("DELETE", "/api/files", { appId, keys });

  if (options.json) return printJson({ success: true, keys });
  success(`Deleted ${keys.length} file${keys.length === 1 ? "" : "s"}`);
}

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  json: "application/json",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  html: "text/html",
  css: "text/css",
  js: "text/javascript",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  zip: "application/zip",
};

export function contentType(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}
