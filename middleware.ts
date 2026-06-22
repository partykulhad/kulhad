import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Protect all private routes — Clerk handles auth redirect.
// The email allowlist check is done inside (private)/layout.tsx using Convex.
const isPrivateRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/machines(.*)",
  "/kitchens(.*)",
  "/delivery-agents(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPrivateRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
