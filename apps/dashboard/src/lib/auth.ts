import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { teams } from "uploadx/db";
import { db } from "./db";

/**
 * Get or create a team record for the current Clerk organization.
 * Returns the team ID or null if no org is selected.
 */
export async function getTeamForOrg(): Promise<{ id: string; clerkOrgId: string } | null> {
  const { orgId, orgSlug } = await auth();
  if (!orgId) return null;

  const existing = await db.query.teams.findFirst({
    where: eq(teams.clerkOrgId, orgId),
  });

  if (existing) return { id: existing.id, clerkOrgId: existing.clerkOrgId };

  // Auto-create team on first access
  const [created] = await db
    .insert(teams)
    .values({ clerkOrgId: orgId, name: orgSlug ?? orgId })
    .returning({ id: teams.id, clerkOrgId: teams.clerkOrgId });

  return created ?? null;
}

/**
 * Hash a token using SHA-256 for storage.
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a new API token: `upx_live_<32 random hex chars>`.
 */
export function generateApiToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `upx_live_${hex}`;
}
