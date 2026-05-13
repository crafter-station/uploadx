import { db } from "@/lib/db";
import { getMinioClient } from "@/lib/minio";
import { apps, fileMetadata } from "@uploadx-sdk/core/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

interface CompleteFile extends FileInfo {
  key: string;
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.appId) {
    return NextResponse.json({ error: "appId required" }, { status: 400 });
  }

  if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const app = await db.query.apps.findFirst({ where: eq(apps.id, body.appId) });
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  // Phase 2: register files in DB after client uploaded them to MinIO
  if (body.action === "complete") {
    const files = body.files as CompleteFile[];
    const inserted = [];

    for (const file of files) {
      const [record] = await db
        .insert(fileMetadata)
        .values({
          appId: body.appId,
          key: file.key,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
        })
        .returning();
      inserted.push(record);
    }

    return NextResponse.json({ files: inserted });
  }

  // Phase 1: generate presigned PUT URLs so client uploads directly to MinIO
  const files = body.files as FileInfo[];
  const client = getMinioClient();
  const uploads = [];

  for (const file of files) {
    const key = `${Date.now()}-${file.name}`;
    const presignedUrl = await client.presignedPutObject(app.bucketName, key, 3600);
    uploads.push({ key, name: file.name, size: file.size, type: file.type, presignedUrl });
  }

  return NextResponse.json({ uploads });
}
