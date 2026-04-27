import { getTeamForOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureAppBucket, getMinioClient } from "@/lib/minio";
import { apps } from "@uploadx-sdk/core/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get("appId");

  if (appId) {
    const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
    if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
    return NextResponse.json({ app });
  }

  const team = await getTeamForOrg();
  if (!team) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const appList = await db.query.apps.findMany({
    where: eq(apps.teamId, team.id),
  });
  return NextResponse.json({ apps: appList });
}

export async function POST(request: Request) {
  const team = await getTeamForOrg();
  if (!team) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await request.json();
  const { name, storageLimit } = body as { name: string; storageLimit?: number | null };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Generate bucket name from app name
  const bucketName = `uploadx-${name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;

  // Create MinIO bucket
  await ensureAppBucket(bucketName);

  // Create DB record
  const [app] = await db
    .insert(apps)
    .values({
      teamId: team.id,
      name: name.trim(),
      bucketName,
      storageLimit: storageLimit ?? null,
    })
    .returning();

  return NextResponse.json(app, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { appId, name, storageLimit } = body as {
    appId: string;
    name?: string;
    storageLimit?: number | null;
  };

  if (!appId) {
    return NextResponse.json({ error: "appId is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name?.trim()) updates.name = name.trim();
  if (storageLimit !== undefined) updates.storageLimit = storageLimit;

  const [updated] = await db.update(apps).set(updates).where(eq(apps.id, appId)).returning();

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const { appId } = body as { appId: string };

  if (!appId) {
    return NextResponse.json({ error: "appId is required" }, { status: 400 });
  }

  const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  // Remove all objects from the MinIO bucket, then remove the bucket
  try {
    const minio = getMinioClient();
    const objects = await new Promise<string[]>((resolve, reject) => {
      const keys: string[] = [];
      const stream = minio.listObjects(app.bucketName, "", true);
      stream.on("data", (obj) => {
        if (obj.name) keys.push(obj.name);
      });
      stream.on("end", () => resolve(keys));
      stream.on("error", reject);
    });
    if (objects.length > 0) {
      await minio.removeObjects(app.bucketName, objects);
    }
    await minio.removeBucket(app.bucketName);
  } catch {
    // Bucket may not exist if MinIO is unreachable — continue with DB cleanup
  }

  // Cascade deletes apiTokens + fileMetadata via FK constraints
  await db.delete(apps).where(eq(apps.id, appId));
  return NextResponse.json({ success: true });
}
