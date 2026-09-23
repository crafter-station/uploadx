import { appForCaller, generateApiToken, hashToken, resolveCaller } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiTokens } from "@uploadx-sdk/core/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const denied = (failure: { status: number; message: string }) =>
  NextResponse.json({ error: failure.message }, { status: failure.status });

export async function GET(request: Request) {
  const result = await resolveCaller(request);
  if (!result.ok) return denied(result.failure);
  const { caller } = result;

  const { searchParams } = new URL(request.url);
  const appId = searchParams.get("appId");
  if (!appId) return NextResponse.json({ error: "appId required" }, { status: 400 });

  const app = await appForCaller(caller, appId);
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const tokens = await db.query.apiTokens.findMany({
    where: eq(apiTokens.appId, appId),
    columns: { id: true, name: true, tokenPrefix: true, lastUsedAt: true, createdAt: true },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return NextResponse.json({ tokens });
}

export async function POST(request: Request) {
  const result = await resolveCaller(request);
  if (!result.ok) return denied(result.failure);
  const { caller } = result;

  if (caller.kind === "appToken") {
    return NextResponse.json({ error: "App tokens cannot mint tokens" }, { status: 403 });
  }

  const body = await request.json();
  const { appId, name } = body as { appId: string; name: string };

  if (!appId || !name?.trim()) {
    return NextResponse.json({ error: "appId and name required" }, { status: 400 });
  }

  const app = await appForCaller(caller, appId);
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const rawToken = generateApiToken();
  const tokenHash = await hashToken(rawToken);
  const tokenPrefix = rawToken.slice(0, 20);

  await db.insert(apiTokens).values({
    appId,
    name: name.trim(),
    tokenHash,
    tokenPrefix,
  });

  // Return the raw token ONCE — it's never stored in plaintext
  return NextResponse.json({ token: rawToken }, { status: 201 });
}

export async function DELETE(request: Request) {
  const result = await resolveCaller(request);
  if (!result.ok) return denied(result.failure);
  const { caller } = result;

  if (caller.kind === "appToken") {
    return NextResponse.json({ error: "App tokens cannot revoke tokens" }, { status: 403 });
  }

  const body = await request.json();
  const { tokenId } = body as { tokenId: string };

  if (!tokenId) {
    return NextResponse.json({ error: "tokenId required" }, { status: 400 });
  }

  const token = await db.query.apiTokens.findFirst({ where: eq(apiTokens.id, tokenId) });
  if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });

  const app = await appForCaller(caller, token.appId);
  if (!app) return NextResponse.json({ error: "Token not found" }, { status: 404 });

  await db.delete(apiTokens).where(eq(apiTokens.id, tokenId));
  return NextResponse.json({ success: true });
}
