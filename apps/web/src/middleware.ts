import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/docs(.*)",
]);

// Check if we're in local mode (no Clerk)
const isLocalMode = process.env.AUTH_MODE === "local";

function localModeMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // In local mode, redirect root to dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/tasks", req.url));
  }

  // Block auth routes in local mode
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) {
    return NextResponse.redirect(new URL("/tasks", req.url));
  }

  // Allow all other routes
  return NextResponse.next();
}

// Export the appropriate middleware based on mode
export default isLocalMode
  ? localModeMiddleware
  : clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    });

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
