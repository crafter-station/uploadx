import { type Caller, appForCaller, resolveCaller } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMinioClient } from "@/lib/minio";
import { fileMetadata } from "@uploadx-sdk/core/db";
import { NextResponse } from "next/server";

interface FileInfo {
  name: string;
  size: number;
  type: string;
  /** Optional path relative to the upload root, preserved in the storage key. */
  path?: string;
}

interface CompleteFile extends FileInfo {
  key: string;
}

/**
 * Build a storage key from an optional prefix and the file's relative path.
 *
 * Keys are sanitized to a safe subset and prefixed with a timestamp so repeated
 * uploads of the same path never silently overwrite each other.
 */
function buildKey(prefix: string | undefined, file: FileInfo): string {
  const relative = (file.path ?? file.name).replace(/\\/g, "/");

  const segments = [...(prefix ?? "").split("/"), ...relative.split("/")]
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, "-"));

  const name = segments.pop() ?? "file";
  const dir = segments.join("/");
  const stamped = `${Date.now()}-${name}`;

  return dir ? `${dir}/${stamped}` : stamped;
}

/** The app this upload targets — an app token's own, or a named, owned app. */
async function targetApp(caller: Caller, appId: string | undefined) {
  if (caller.kind === "appToken") return appForCaller(caller, caller.appId);
  if (!appId) return null;
  return appForCaller(caller, appId);
}

export async function POST(request: Request) {
  const body = await request.json();

  const result = await resolveCaller(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.failure.message }, { status: result.failure.status });
  }

  if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const app = await targetApp(result.caller, body.appId);
  if (!app) {
    return NextResponse.json({ error: "appId required, or app not found" }, { status: 404 });
  }

  // Phase 2: register files in DB after client uploaded them to MinIO
  if (body.action === "complete") {
    const files = body.files as CompleteFile[];
    const inserted = await db
      .insert(fileMetadata)
      .values(
        files.map((file) => ({
          appId: app.id,
          key: file.key,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
        })),
      )
      .returning();

    return NextResponse.json({ files: inserted });
  }

  // Phase 1: generate presigned PUT URLs so client uploads directly to MinIO
  const files = body.files as FileInfo[];
  const prefix = typeof body.prefix === "string" ? body.prefix : undefined;
  const client = getMinioClient();

  const uploads = await Promise.all(
    files.map(async (file) => {
      const key = buildKey(prefix, file);
      const presignedUrl = await client.presignedPutObject(app.bucketName, key, 3600);
      return { key, name: file.name, size: file.size, type: file.type, presignedUrl };
    }),
  );

  return NextResponse.json({ uploads });
}
