import type { Metadata } from "next";
import Link from "next/link";
import { SignIn, SignOutButton } from "@clerk/nextjs";
import { auth as clerkAuth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  // Accept only local return paths, never protocol-relative/external redirects.
  const returnTo = callbackUrl?.startsWith("/") && !/[\\\s]/.test(callbackUrl) && !callbackUrl.startsWith("//") ? callbackUrl : "/";
  const { userId } = await clerkAuth();
  if (userId && await auth()) redirect(returnTo);

  // Clerk redirects existing sessions away from SignIn, even when our GitHub check fails.
  if (userId) {
    return (
      <div className="page-shell flex flex-col items-start gap-5">
        <h1 className="display-title">Sign in again</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Your GitHub connection could not be verified. Sign out, then sign in with GitHub again to reconnect.
        </p>
        <SignOutButton redirectUrl={`/sign-in?callbackUrl=${encodeURIComponent(returnTo)}`}>
          <Button type="button">Sign out and retry</Button>
        </SignOutButton>
      </div>
    );
  }
  return (
    <div className="page-shell grid items-start gap-12 md:grid-cols-2 md:py-24">
      <div className="max-w-md">
        <p className="eyebrow">You belong in open source</p>
        <h1 className="display-title mt-5">A small contribution.<br />A real difference.</h1>
        <p className="mt-6 text-base leading-7 text-muted-foreground">Sign in with GitHub to save the projects you love, manage your repositories, and help open source grow.</p>
        <div className="mt-8 border-t border-border pt-6 text-sm leading-7 text-muted-foreground">Just exploring? The directory is open to everyone.<br /><Link href="/explore" className="font-medium text-foreground underline underline-offset-4">Browse projects →</Link></div>
      </div>
      <div className="min-w-0 md:justify-self-end">
        <h2 className="mb-6 text-lg font-semibold">Sign in to maintain.help</h2>
        <SignIn routing="hash" withSignUp oauthFlow="redirect" forceRedirectUrl={returnTo} signUpForceRedirectUrl={returnTo} />
      </div>
    </div>
  );
}
