import { APP_TOKEN_PREFIX, listUserOrgs, resolveCaller } from "@/lib/auth";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * GET /api/cli/me
 *
 * Backs `uploadx whoami` and the org picker during `uploadx login`. Clerk
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
  const client = await clerkClient();
  const [user, orgs] = await Promise.all([client.users.getUser(userId), listUserOrgs(userId)]);

  return NextResponse.json({
    kind: authObject.tokenType === "session_token" ? "session" : "oauth",
    userId,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
    orgs,
  });
}
