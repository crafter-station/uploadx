import { auth, clerkClient } from "@clerk/nextjs/server";
import { apiTokens, apps, teams } from "@uploadx-sdk/core/db";
import { eq } from "drizzle-orm";
import { db } from "./db";

/** Header the CLI uses to name the organization it is acting for. */
export const ORG_HEADER = "x-uploadx-org";

/** Prefix of an app-scoped SDK token. */
export const APP_TOKEN_PREFIX = "upx_live_";

/**
 * Who is making a request.
 *
 * - `session` — a signed-in dashboard browser (Clerk session cookie).
 * - `oauth` — the CLI, holding a Clerk OAuth access token for a user.
 * - `appToken` — the SDK, holding an app-scoped `upx_live_…` token.
 */
export type Caller =
  | { kind: "session"; userId: string; clerkOrgId: string; teamId: string }
  | { kind: "oauth"; userId: string; clerkOrgId: string; teamId: string; scopes: string[] }
  | { kind: "appToken"; appId: string; tokenId: string };

export type CallerFailure = { status: number; message: string };

export type ResolveResult = { ok: true; caller: Caller } | { ok: false; failure: CallerFailure };

const fail = (status: number, message: string): ResolveResult => ({
  ok: false,
  failure: { status, message },
});

/**
 * Get or create the team record for a Clerk organization.
 */
export async function getTeamForClerkOrg(
  clerkOrgId: string,
  name?: string | null,
): Promise<{ id: string; clerkOrgId: string } | null> {
  const existing = await db.query.teams.findFirst({
    where: eq(teams.clerkOrgId, clerkOrgId),
  });

  if (existing) return { id: existing.id, clerkOrgId: existing.clerkOrgId };

  // Only when creating the team is the human-readable name worth a lookup —
  // a CLI caller knows the org id from its token, but not the name.
  let teamName = name;
  if (!teamName) {
    const client = await clerkClient();
    teamName = await client.organizations
      .getOrganization({ organizationId: clerkOrgId })
      .then((org) => org.name)
      .catch(() => null);
  }

  const [created] = await db
    .insert(teams)
    .values({ clerkOrgId, name: teamName ?? clerkOrgId })
    .returning({ id: teams.id, clerkOrgId: teams.clerkOrgId });

  return created ?? null;
}

/**
 * Get or create a team record for the current Clerk organization.
 * Returns the team ID or null if no org is selected.
 */
export async function getTeamForOrg(): Promise<{ id: string; clerkOrgId: string } | null> {
  const { orgId, orgSlug } = await auth();
  if (!orgId) return null;
  return getTeamForClerkOrg(orgId, orgSlug);
}

/**
 * The organizations a Clerk user belongs to, newest membership first.
 */
export async function listUserOrgs(
  userId: string,
): Promise<Array<{ id: string; slug: string | null; name: string }>> {
  const client = await clerkClient();
  const { data } = await client.users.getOrganizationMembershipList({ userId, limit: 100 });
  return data.map((m) => ({
    id: m.organization.id,
    slug: m.organization.slug,
    name: m.organization.name,
  }));
}

/**
 * Read the organization the user chose when approving the CLI.
 *
 * Clerk's typed auth object exposes no organization for OAuth tokens, but the
 * access token itself carries an `org_id` claim. `getToken()` hands back the
 * very token Clerk just verified, so reading a claim off it is sound — we are
 * decoding an already-authenticated token, not trusting caller input.
 *
 * Returns null for opaque tokens, or when the user approved without an org.
 */
export async function tokenClaims(authObject: {
  getToken: () => Promise<string | null>;
}): Promise<Record<string, unknown> | null> {
  try {
    const raw = await authObject.getToken();
    const payload = raw?.split(".")[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

async function orgFromToken(authObject: {
  getToken: () => Promise<string | null>;
}): Promise<string | null> {
  const claims = await tokenClaims(authObject);
  return typeof claims?.org_id === "string" ? claims.org_id : null;
}

/**
 * Resolve which organization an OAuth caller is acting for, by membership.
 *
 * Used when the CLI asks to act for an org other than the one baked into its
 * token, and as the fallback when a token carries no `org_id` at all.
 */
async function resolveOrgForUser(
  userId: string,
  requested: string | null,
): Promise<
  { ok: true; org: { id: string; name: string } } | { ok: false; failure: CallerFailure }
> {
  const orgs = await listUserOrgs(userId);

  if (orgs.length === 0) {
    return { ok: false, failure: { status: 403, message: "User belongs to no organization" } };
  }

  if (requested) {
    const match = orgs.find((o) => o.id === requested || o.slug === requested);
    if (!match) {
      return {
        ok: false,
        failure: { status: 403, message: `Not a member of organization "${requested}"` },
      };
    }
    return { ok: true, org: { id: match.id, name: match.name } };
  }

  const only = orgs[0];
  if (orgs.length > 1 || !only) {
    return {
      ok: false,
      failure: {
        status: 400,
        message: "Multiple organizations — name one with the X-Uploadx-Org header",
      },
    };
  }

  return { ok: true, org: { id: only.id, name: only.name } };
}

/**
 * Look up an app-scoped SDK token and mark it used.
 */
async function resolveAppToken(token: string): Promise<ResolveResult> {
  const record = await db.query.apiTokens.findFirst({
    where: eq(apiTokens.tokenHash, await hashToken(token)),
  });

  if (!record) return fail(401, "Invalid token");

  await db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, record.id));

  return { ok: true, caller: { kind: "appToken", appId: record.appId, tokenId: record.id } };
}

/**
 * Identify the caller behind a request.
 *
 * Checks an app-scoped Bearer token first so SDK traffic never reaches Clerk,
 * then a token supplied in the request body (the SDK's upload-completion path),
 * then falls back to Clerk for dashboard sessions and CLI OAuth tokens.
 */
export async function resolveCaller(
  request: Request,
  opts: { bodyToken?: string } = {},
): Promise<ResolveResult> {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (bearer?.startsWith(APP_TOKEN_PREFIX)) return resolveAppToken(bearer);
  if (opts.bodyToken) return resolveAppToken(opts.bodyToken);

  const authObject = await auth({ acceptsToken: ["session_token", "oauth_token"] });

  if (!authObject.isAuthenticated) return fail(401, "Unauthorized");

  if (authObject.tokenType === "session_token") {
    const { userId, orgId, orgSlug } = authObject;
    if (!orgId) return fail(400, "No organization selected");
    const team = await getTeamForClerkOrg(orgId, orgSlug);
    if (!team) return fail(500, "Could not resolve team");
    return { ok: true, caller: { kind: "session", userId, clerkOrgId: orgId, teamId: team.id } };
  }

  if (authObject.tokenType === "oauth_token") {
    const userId = authObject.userId;
    if (!userId) return fail(401, "Unauthorized");

    const requested = request.headers.get(ORG_HEADER);
    const claimed = await orgFromToken(authObject);

    // The org the user approved is already in the token, so the common case —
    // no header, or a header naming that same org — costs no Clerk API call.
    // Anything else means the CLI is asking to act for a different org, and
    // that needs membership verified.
    let org: { id: string; name: string | null };
    if (claimed && (!requested || requested === claimed)) {
      org = { id: claimed, name: null };
    } else {
      const resolved = await resolveOrgForUser(userId, requested);
      if (!resolved.ok) return { ok: false, failure: resolved.failure };
      org = { id: resolved.org.id, name: resolved.org.name };
    }

    const team = await getTeamForClerkOrg(org.id, org.name);
    if (!team) return fail(500, "Could not resolve team");

    return {
      ok: true,
      caller: {
        kind: "oauth",
        userId,
        clerkOrgId: org.id,
        teamId: team.id,
        scopes: authObject.scopes ?? [],
      },
    };
  }

  return fail(401, "Unauthorized");
}

/**
 * Fetch an app if — and only if — this caller may act on it.
 *
 * App-scoped SDK tokens may only touch their own app; dashboard and CLI callers
 * may touch any app owned by their team. Returns null when the app does not
 * exist or belongs to someone else, so callers cannot probe for app ids.
 */
export async function appForCaller(caller: Caller, appId: string) {
  const app = await db.query.apps.findFirst({ where: eq(apps.id, appId) });
  if (!app) return null;

  if (caller.kind === "appToken") return app.id === caller.appId ? app : null;
  return app.teamId === caller.teamId ? app : null;
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
