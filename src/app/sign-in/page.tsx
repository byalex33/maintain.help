import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

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
