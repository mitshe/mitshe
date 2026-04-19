import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authMode =
  process.env.AUTH_MODE || process.env.NEXT_PUBLIC_AUTH_MODE || "selfhosted";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/docs(.*)",
]);

// Selfhosted mode: JWT auth handled by frontend AuthGuard
function selfhostedMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/chat", req.url));
  }

  return NextResponse.next();
}

export default authMode === "clerk"
  ? clerkMiddleware(async (auth, req) => {
      const { pathname } = req.nextUrl;

      if (pathname === "/") {
        return NextResponse.redirect(new URL("/chat", req.url));
      }

      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    })
  : selfhostedMiddleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
