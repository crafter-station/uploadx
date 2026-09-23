import { NextResponse } from "next/server";

/**
 * Minimum CLI version this instance supports. The CLI warns when it is older.
 */
const MIN_CLI_VERSION = "0.1.0";

/**
 * Clerk encodes the Frontend API host in the publishable key:
 * `pk_(test|live)_<base64 of "host$">`.
 */
function clerkFrontendApiUrl(): string | null {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return null;

  const encoded = key.replace(/^pk_(test|live)_/, "");
  try {
    const host = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
    return host ? `https://${host}` : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/cli/config
 *
 * Public discovery document for the CLI: tells it which Clerk instance to run the
 * device authorization flow against, and which OAuth client to identify as. Both
 * values are public by design — the CLI is a public OAuth client with no secret.
 */
export function GET(request: Request) {
  const clerkFapiUrl = clerkFrontendApiUrl();
  const oauthClientId = process.env.CLERK_CLI_OAUTH_CLIENT_ID ?? null;

  return NextResponse.json({
    instanceUrl: new URL(request.url).origin,
    clerkFapiUrl,
    oauthClientId,
    minCliVersion: MIN_CLI_VERSION,
    // Set CLERK_CLI_OAUTH_CLIENT_ID to the client id of a public Clerk OAuth
    // application with the device authorization grant enabled.
    configured: Boolean(clerkFapiUrl && oauthClientId),
  });
}
