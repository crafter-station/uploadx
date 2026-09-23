import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/", "/docs(.*)", "/sign-in(.*)", "/sign-up(.*)"]);

/**
 * Every `/api` route authenticates itself through `resolveCaller`, which accepts
 * Clerk sessions, CLI OAuth tokens and app-scoped SDK tokens alike and answers
 * with a JSON 401. Middleware deliberately does not protect them: `auth.protect()`
 * renders a 404 HTML page for unauthenticated session requests, which is useless
 * to an API client.
 *
 * A new route under /api is therefore PUBLIC until it calls `resolveCaller`.
 */
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request) || isApiRoute(request)) return;
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
