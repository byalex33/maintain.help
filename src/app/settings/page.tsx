import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">Manage your maintain.help account.</p>
        </div>
        <Link href="/profile" className="text-sm underline underline-offset-4">View your profile</Link>
      </div>
      <section aria-labelledby="account-heading" className="rounded-lg border p-6">
        <h2 id="account-heading" className="text-lg font-semibold">Account</h2>
        <dl className="mt-5 space-y-4 text-sm">
          <div>
            <dt className="text-neutral-600 dark:text-neutral-400">Name</dt>
            <dd className="mt-1 font-medium">{session.user.name ?? session.user.githubLogin}</dd>
          </div>
          <div>
            <dt className="text-neutral-600 dark:text-neutral-400">GitHub account</dt>
            <dd className="mt-1">
              <a href={`https://github.com/${encodeURIComponent(session.user.githubLogin)}`} className="font-medium underline underline-offset-4">
                @{session.user.githubLogin}
              </a>
            </dd>
          </div>
        </dl>
        <p className="mt-5 text-sm text-neutral-600 dark:text-neutral-400">You sign in with GitHub.</p>
      </section>
      <DeleteAccount />
    </div>
  );
}
