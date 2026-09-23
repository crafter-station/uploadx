import { type Caller, appForCaller, resolveCaller } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMinioClient } from "@/lib/minio";
import { fileMetadata } from "@uploadx-sdk/core/db";
import { and, asc, count, desc, eq, inArray, like } from "drizzle-orm";
import { NextResponse } from "next/server";

const denied = (failure: { status: number; message: string }) =>
  NextResponse.json({ error: failure.message }, { status: failure.status });

/**
 * The app a files request targets: an app token's own app, or the `appId` a
 * dashboard/CLI caller named — verified to belong to them.
 */
async function targetApp(caller: Caller, appId: string | null) {
  if (caller.kind === "appToken") return appForCaller(caller, caller.appId);
  if (!appId) return null;
  return appForCaller(caller, appId);
}

export async function GET(request: Request) {
  const result = await resolveCaller(request);
  if (!result.ok) return denied(result.failure);
  const { caller } = result;

  const { searchParams } = new URL(request.url);
  const app = await targetApp(caller, searchParams.get("appId"));
  if (!app) {
    return NextResponse.json({ error: "appId required, or app not found" }, { status: 404 });
  }

  const search = searchParams.get("search");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 10)));
  const sortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  const conditions = [eq(fileMetadata.appId, app.id)];
  if (search) {
    conditions.push(like(fileMetadata.name, `%${search}%`));
  }

  const whereClause = and(...conditions);

  const [row] = await db
    .select({ total: count(fileMetadata.id) })
    .from(fileMetadata)
    .where(whereClause);
  const total = row?.total ?? 0;

  const orderFn = sortDir === "asc" ? asc : desc;

  const files = await db.query.fileMetadata.findMany({
    where: whereClause,
    orderBy: (f) => [orderFn(f.uploadedAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return NextResponse.json({
    files,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/**
 * POST /api/files — Register uploaded files (called by SDK after upload completion).
 * Authenticates via UPLOADX_TOKEN in the request body.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    token?: string;
    files: Array<{ key: string; name: string; size: number; type: string }>;
  };

  if (!body.files?.length) {
    return NextResponse.json({ error: "files required" }, { status: 400 });
  }

  const result = await resolveCaller(request, { bodyToken: body.token });
  if (!result.ok) return denied(result.failure);
  const { caller } = result;

  const app = await targetApp(caller, null);
  if (!app) {
    return NextResponse.json({ error: "Only app tokens may register files" }, { status: 403 });
  }

  const inserted = await db
    .insert(fileMetadata)
    .values(
      body.files.map((f) => ({
        appId: app.id,
        key: f.key,
        name: f.name,
        size: f.size,
        type: f.type,
      })),
    )
    .returning();

  return NextResponse.json({ files: inserted });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const { fileId, fileIds, keys, appId } = body as {
    fileId?: string;
    fileIds?: string[];
    keys?: string[];
    appId?: string;
  };

  const result = await resolveCaller(request);
  if (!result.ok) return denied(result.failure);
  const { caller } = result;

  const minio = getMinioClient();

  // Delete by storage key — the SDK and CLI path.
  if (keys?.length) {
    const app = await targetApp(caller, appId ?? null);
    if (!app) {
      return NextResponse.json({ error: "appId required, or app not found" }, { status: 404 });
    }

    for (const key of keys) {
      try {
        await minio.removeObject(app.bucketName, key);
      } catch {
        // Continue even if MinIO delete fails
      }
    }

    await db
      .delete(fileMetadata)
      .where(and(eq(fileMetadata.appId, app.id), inArray(fileMetadata.key, keys)));

    return NextResponse.json({ success: true });
  }

  // Delete by file id — the dashboard path.
  const ids = fileIds ?? (fileId ? [fileId] : []);
  if (ids.length === 0) {
    return NextResponse.json({ error: "fileId, fileIds or keys required" }, { status: 400 });
  }

  for (const id of ids) {
    const file = await db.query.fileMetadata.findFirst({
      where: eq(fileMetadata.id, id),
    });
    if (!file) continue;

    const app = await appForCaller(caller, file.appId);
    if (!app) continue;

    try {
      await minio.removeObject(app.bucketName, file.key);
    } catch {
      // Continue even if MinIO delete fails
    }

    await db.delete(fileMetadata).where(eq(fileMetadata.id, id));
  }

  return NextResponse.json({ success: true });
}
