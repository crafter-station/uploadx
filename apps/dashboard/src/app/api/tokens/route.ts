import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { apiTokens } from "uploadx/db";
import { generateApiToken, hashToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get("appId");
  if (!appId) return NextResponse.json({ error: "appId required" }, { status: 400 });

  const tokens = await db.query.apiTokens.findMany({
    where: eq(apiTokens.appId, appId),
    columns: { id: true, name: true, tokenPrefix: true, lastUsedAt: true, createdAt: true },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return NextResponse.json({ tokens });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { appId, name } = body as { appId: string; name: string };

  if (!appId || !name?.trim()) {
    return NextResponse.json({ error: "appId and name required" }, { status: 400 });
  }

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
  const body = await request.json();
  const { tokenId } = body as { tokenId: string };

  if (!tokenId) {
    return NextResponse.json({ error: "tokenId required" }, { status: 400 });
  }

  await db.delete(apiTokens).where(eq(apiTokens.id, tokenId));
  return NextResponse.json({ success: true });
}
