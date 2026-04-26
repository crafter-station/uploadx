import { NextResponse } from "next/server";
import { and, eq, like } from "drizzle-orm";
import { fileMetadata } from "uploadx/db";
import { db } from "@/lib/db";
import { getMinioClient } from "@/lib/minio";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get("appId");
  const search = searchParams.get("search");

  if (!appId) {
    return NextResponse.json({ error: "appId required" }, { status: 400 });
  }

  const conditions = [eq(fileMetadata.appId, appId)];
  if (search) {
    conditions.push(like(fileMetadata.name, `%${search}%`));
  }

  const files = await db.query.fileMetadata.findMany({
    where: and(...conditions),
    orderBy: (f, { desc }) => [desc(f.uploadedAt)],
  });

  return NextResponse.json({ files });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const { fileId } = body as { fileId: string };

  if (!fileId) {
    return NextResponse.json({ error: "fileId required" }, { status: 400 });
  }

  // Get file metadata for MinIO deletion
  const file = await db.query.fileMetadata.findFirst({
    where: eq(fileMetadata.id, fileId),
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // Get the app to find bucket name
  const { apps } = await import("uploadx/db");
  const app = await db.query.apps.findFirst({
    where: eq(apps.id, file.appId),
  });

  if (app) {
    // Delete from MinIO
    try {
      const client = getMinioClient();
      await client.removeObject(app.bucketName, file.key);
    } catch {
      // Continue even if MinIO delete fails
    }
  }

  // Delete from DB
  await db.delete(fileMetadata).where(eq(fileMetadata.id, fileId));
  return NextResponse.json({ success: true });
}
