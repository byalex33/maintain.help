import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserProfile } from "@clerk/nextjs";
import { auth } from "@/lib/auth";
import { DeleteAccount } from "@/components/auth/delete-account";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=%2Fsettings");

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">Manage your profile details and sign-in security.</p>
        </div>
        <Link href="/profile" className="text-sm underline underline-offset-4">View your profile</Link>
      </div>
      <UserProfile routing="hash" appearance={{
        variables: {
          colorBackground: "var(--background)",
          colorForeground: "var(--foreground)",
          colorMuted: "var(--muted)",
          colorMutedForeground: "var(--muted-foreground)",
          colorPrimary: "var(--foreground)",
          colorPrimaryForeground: "var(--background)",
          colorInput: "var(--background)",
          colorInputForeground: "var(--foreground)",
          colorBorder: "var(--border)",
          fontFamily: "var(--font-sans)",
          borderRadius: "0.5rem",
        },
        elements: {
          rootBox: { width: "100%" },
          cardBox: { width: "100%", height: "auto", minHeight: "24rem", boxShadow: "none", border: "1px solid var(--border)" },
          // Account deletion below also cleans up maintain.help data.
          profileSection__danger: { display: "none" },
          // A verified GitHub connection is required by the app's identity bridge.
          profileSection__connectedAccounts: { display: "none" },
        },
      }} />
      <DeleteAccount />
    </div>
  );
}
