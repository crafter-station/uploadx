import { APP_TOKEN_PREFIX, listUserOrgs, resolveCaller, tokenClaims } from "@/lib/auth";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** How long to wait on Clerk before answering from the token alone. */
const ENRICH_TIMEOUT_MS = 5_000;

interface Org {
  id: string;
  slug: string | null;
  name: string;
}

/**
 * Display name and org list, or null if Clerk does not answer quickly.
 *
 * Login must not depend on this: the token already carries the user id and the
 * organization, and a slow Clerk Backend API call here would otherwise leave
 * `uploadx login` hanging with no way to finish.
 */
async function enrich(
  userId: string,
): Promise<{ email: string | null; name: string | null; orgs: Org[] } | null> {
  const lookup = (async () => {
    const client = await clerkClient();
    const [user, orgs] = await Promise.all([client.users.getUser(userId), listUserOrgs(userId)]);
    return {
      email: user.primaryEmailAddress?.emailAddress ?? null,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
      orgs,
    };
  })();

  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), ENRICH_TIMEOUT_MS),
  );

  return Promise.race([lookup, timeout]).catch(() => null);
}

/**
 * GET /api/cli/me
 *
 * Backs `uploadx whoami` and the organization picker during login. Clerk
 * advertises no userinfo endpoint for OAuth tokens, so identity comes from here.
 *
 * Unlike every other route, this one must answer for a user who has not settled
 * on an organization yet — that is precisely what the login flow needs in order
 * to offer a choice — so it authenticates directly rather than through
 * `resolveCaller`, which always resolves an org.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (bearer?.startsWith(APP_TOKEN_PREFIX)) {
    const result = await resolveCaller(request);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.failure.message },
        { status: result.failure.status },
      );
    }
    const caller = result.caller;
    return NextResponse.json({
      kind: "appToken",
      appId: caller.kind === "appToken" ? caller.appId : null,
    });
  }

  const authObject = await auth({ acceptsToken: ["session_token", "oauth_token"] });
  if (!authObject.isAuthenticated || !authObject.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = authObject.userId;
  const isOAuth = authObject.tokenType === "oauth_token";

  // The organization the user approved is in the token; no network needed.
  const claims = isOAuth ? await tokenClaims(authObject) : null;
  const activeOrg =
    (typeof claims?.org_id === "string" ? claims.org_id : null) ??
    (authObject.tokenType === "session_token" ? authObject.orgId : null);

  const extra = await enrich(userId);

  return NextResponse.json({
    kind: isOAuth ? "oauth" : "session",
    userId,
    activeOrg,
    email: extra?.email ?? null,
    name: extra?.name ?? null,
    orgs: extra?.orgs ?? [],
    // True when Clerk did not answer in time and the reply came from the token.
    degraded: extra === null,
  });
}
