import { hashToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMinioClient } from "@/lib/minio";
import { apiTokens, apps, fileMetadata } from "@uploadx-sdk/core/db";
import { and, asc, count, desc, eq, like } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get("appId");
  const search = searchParams.get("search");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 10)));
  const sortDir = searchParams.get("dir") === "asc" ? "asc" : "desc";

  if (!appId) {
    return NextResponse.json({ error: "appId required" }, { status: 400 });
  }

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
  const { fileId } = body as { fileId: string };

  if (!fileId) {
    return NextResponse.json({ error: "fileId required" }, { status: 400 });
  }

  const file = await db.query.fileMetadata.findFirst({
    where: eq(fileMetadata.id, fileId),
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

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

  await db.delete(fileMetadata).where(eq(fileMetadata.id, fileId));
  return NextResponse.json({ success: true });
}
