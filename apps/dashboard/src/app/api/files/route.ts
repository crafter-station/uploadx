import { hashToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMinioClient } from "@/lib/minio";
import { apiTokens, apps, fileMetadata } from "@uploadx-sdk/core/db";
import { and, asc, count, desc, eq, inArray, like } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * Resolve the appId from either Bearer token (SDK use) or appId query param
 * (dashboard UI use). Returns null with an error response if neither works.
 */
async function resolveAppId(
  request: Request,
  fallbackAppId: string | null,
): Promise<{ appId: string } | { error: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const tokenHash = await hashToken(token);
    const record = await db.query.apiTokens.findFirst({
      where: eq(apiTokens.tokenHash, tokenHash),
    });
    if (!record) {
      return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
    }
    return { appId: record.appId };
  }
  if (fallbackAppId) return { appId: fallbackAppId };
  return { error: NextResponse.json({ error: "appId or Bearer token required" }, { status: 400 }) };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 10)));
  const sortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  const resolved = await resolveAppId(request, searchParams.get("appId"));
  if ("error" in resolved) return resolved.error;
  const { appId } = resolved;

  const conditions = [eq(fileMetadata.appId, appId)];
  if (search) {
    conditions.push(like(fileMetadata.name, `%${search}%`));
  }

  const whereClause = and(...conditions);

  const [{ total }] = await db
    .select({ total: count(fileMetadata.id) })
    .from(fileMetadata)
    .where(whereClause);

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
    token: string;
    files: Array<{ key: string; name: string; size: number; type: string }>;
  };

  if (!body.token || !body.files?.length) {
    return NextResponse.json({ error: "token and files required" }, { status: 400 });
  }

  const tokenHash = await hashToken(body.token);
  const record = await db.query.apiTokens.findFirst({
    where: eq(apiTokens.tokenHash, tokenHash),
  });

  if (!record) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const inserted = await db
    .insert(fileMetadata)
    .values(
      body.files.map((f) => ({
        appId: record.appId,
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
  const { fileId, fileIds, keys } = body as {
    fileId?: string;
    fileIds?: string[];
    keys?: string[];
  };

  // Token-based delete by key (SDK use)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    if (!keys?.length) {
      return NextResponse.json({ error: "keys required" }, { status: 400 });
    }
    const token = authHeader.slice(7);
    const tokenHash = await hashToken(token);
    const record = await db.query.apiTokens.findFirst({
      where: eq(apiTokens.tokenHash, tokenHash),
    });
    if (!record) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const app = await db.query.apps.findFirst({ where: eq(apps.id, record.appId) });
    if (app) {
      const client = getMinioClient();
      for (const key of keys) {
        try {
          await client.removeObject(app.bucketName, key);
        } catch {
          // Continue even if MinIO delete fails
        }
      }
    }

    await db
      .delete(fileMetadata)
      .where(and(eq(fileMetadata.appId, record.appId), inArray(fileMetadata.key, keys)));

    return NextResponse.json({ success: true });
  }

  // Existing dashboard UI delete by fileId
  const ids = fileIds ?? (fileId ? [fileId] : []);
  if (ids.length === 0) {
    return NextResponse.json({ error: "fileId or fileIds required" }, { status: 400 });
  }

  for (const id of ids) {
    const file = await db.query.fileMetadata.findFirst({
      where: eq(fileMetadata.id, id),
    });
    if (!file) continue;

    const app = await db.query.apps.findFirst({
      where: eq(apps.id, file.appId),
    });

    if (app) {
      try {
        const client = getMinioClient();
        await client.removeObject(app.bucketName, file.key);
      } catch {
        // Continue even if MinIO delete fails
      }
    }

    await db.delete(fileMetadata).where(eq(fileMetadata.id, id));
  }

  return NextResponse.json({ success: true });
}
