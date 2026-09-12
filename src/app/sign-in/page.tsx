import type { Metadata } from "next";
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
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const { callbackUrl } = await searchParams;
  // Accept only local return paths, never protocol-relative/external redirects.
  const returnTo = typeof callbackUrl === "string" && callbackUrl.startsWith("/") && !/[\\\s]/.test(callbackUrl) && !callbackUrl.startsWith("//") ? callbackUrl : "/";
  const { userId } = await clerkAuth();
  if (userId && await auth()) redirect(returnTo);

  // Clerk redirects existing sessions away from SignIn, even when our GitHub check fails.
  if (userId) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in again</h1>
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
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Sign in with GitHub to claim repositories you maintain and set their help status yourself.
      </p>
      <SignIn routing="hash" withSignUp oauthFlow="redirect" forceRedirectUrl={returnTo} signUpForceRedirectUrl={returnTo} />
    </div>
  );
}
