import { clerkMiddleware } from "@clerk/nextjs/server";

// Public discovery stays public. Authorization remains in actions and route handlers.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next/|favicon\\.ico$|icon\\.svg$|robots\\.txt$|sitemap\\.xml$|(?:file|globe|next|vercel|window)\\.svg$).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
