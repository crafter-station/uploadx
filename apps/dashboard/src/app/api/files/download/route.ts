import { appForCaller, resolveCaller } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMinioClient } from "@/lib/minio";
import { fileMetadata } from "@uploadx-sdk/core/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const result = await resolveCaller(request);
  if (!result.ok) {
    return NextResponse.json({ error: result.failure.message }, { status: result.failure.status });
  }

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "fileId required" }, { status: 400 });
  }

  const file = await db.query.fileMetadata.findFirst({
    where: eq(fileMetadata.id, fileId),
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const app = await appForCaller(result.caller, file.appId);
  if (!app) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const client = getMinioClient();
  const url = await client.presignedGetObject(app.bucketName, file.key, 3600);

  return NextResponse.json({ url });
}
