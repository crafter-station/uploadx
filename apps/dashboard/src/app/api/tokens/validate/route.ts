import { hashToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiTokens, apps } from "@uploadx-sdk/core/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * POST /api/tokens/validate
 *
 * Called by the SDK to validate an UPLOADX_TOKEN.
 * Returns { valid, appId, bucketName } on success.
 * This route is public (not behind Clerk auth).
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { token } = body as { token: string };

  if (!token) {
    return NextResponse.json({ valid: false, error: "Token required" }, { status: 400 });
  }

  const tokenHash = await hashToken(token);

  const record = await db.query.apiTokens.findFirst({
    where: eq(apiTokens.tokenHash, tokenHash),
  });

  if (!record) {
    return NextResponse.json({ valid: false, error: "Invalid token" }, { status: 401 });
  }

  // Update last used timestamp
  await db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, record.id));

  // Get the associated app for bucket info
  const app = await db.query.apps.findFirst({
    where: eq(apps.id, record.appId),
  });

  if (!app) {
    return NextResponse.json({ valid: false, error: "App not found" }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    appId: app.id,
    bucketName: app.bucketName,
    minio: {
      endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
      port: process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : 9000,
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY ?? "",
      secretKey: process.env.MINIO_SECRET_KEY ?? "",
    },
  });
}
