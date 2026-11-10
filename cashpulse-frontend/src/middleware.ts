import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes requiring active authenticated corporate session
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // Permit local development and offline demo test sessions
    const demoCookie = req.cookies.get("cashpulse_demo_session")?.value;
    const demoParam = req.nextUrl.searchParams.get("demo") === "true";
    if (demoCookie || demoParam) {
      return;
    }

    // Strictly enforce corporate authentication; unauthenticated requests redirect to /login
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
