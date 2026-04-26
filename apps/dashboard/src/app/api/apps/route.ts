import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { apps } from "uploadx/db";
import { getTeamForOrg } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureAppBucket } from "@/lib/minio";

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
  const { name } = body as { name: string };

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
    .values({ teamId: team.id, name: name.trim(), bucketName })
    .returning();

  return NextResponse.json(app, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { appId, name } = body as { appId: string; name: string };

  if (!appId || !name?.trim()) {
    return NextResponse.json({ error: "appId and name are required" }, { status: 400 });
  }

  const [updated] = await db
    .update(apps)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(apps.id, appId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const { appId } = body as { appId: string };

  if (!appId) {
    return NextResponse.json({ error: "appId is required" }, { status: 400 });
  }

  await db.delete(apps).where(eq(apps.id, appId));
  return NextResponse.json({ success: true });
}
