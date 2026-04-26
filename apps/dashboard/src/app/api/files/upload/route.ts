import { db } from "@/lib/db";
import { getMinioClient } from "@/lib/minio";
import { apps, fileMetadata } from "@uploadx-sdk/core/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const appId = formData.get("appId") as string | null;

  if (!appId) {
    return NextResponse.json({ error: "appId required" }, { status: 400 });
  }

  const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const files = formData.getAll("files") as File[];
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const client = getMinioClient();
  const inserted = [];

  for (const file of files) {
    const key = `${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await client.putObject(app.bucketName, key, buffer, buffer.length, {
      "Content-Type": file.type,
    });

    const [record] = await db
      .insert(fileMetadata)
      .values({
        appId,
        key,
        name: file.name,
        size: buffer.length,
        type: file.type || "application/octet-stream",
      })
      .returning();

    inserted.push(record);
  }

  return NextResponse.json({ files: inserted });
}
