import { db } from "@/lib/db";
import { teams } from "@uploadx-sdk/core/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * POST /api/webhooks/clerk
 *
 * Receives Clerk webhook events for organization sync.
 * In production, you should verify the webhook signature.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { type, data } = body as { type: string; data: Record<string, unknown> };

  switch (type) {
    case "organization.created":
    case "organization.updated": {
      const orgId = data.id as string;
      const name = (data.name as string) ?? orgId;

      const existing = await db.query.teams.findFirst({
        where: eq(teams.clerkOrgId, orgId),
      });

      if (existing) {
        await db.update(teams).set({ name }).where(eq(teams.id, existing.id));
      } else {
        await db.insert(teams).values({ clerkOrgId: orgId, name });
      }
      break;
    }

    case "organization.deleted": {
      const orgId = data.id as string;
      await db.delete(teams).where(eq(teams.clerkOrgId, orgId));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
