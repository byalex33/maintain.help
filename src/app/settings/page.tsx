import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DeleteAccount } from "@/components/auth/delete-account";
import { ProfileForm } from "@/components/auth/profile-form";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@clerk/nextjs";
import { ArrowLeft, ArrowUpRight, Check, GitBranch, LogOut, UserRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in?callbackUrl=%2Fsettings");
  const { user } = session;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/profile" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden="true" className="size-4" />Back to profile</Link>
      <header className="mt-8 border-b pb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Your account</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h1>
        <p className="mt-3 text-muted-foreground">A little housekeeping. Then back to helping open source.</p>
      </header>
      <div className="mt-8 grid gap-8 md:grid-cols-[180px_minmax(0,1fr)] lg:gap-14">
        <nav aria-label="Settings sections" className="flex flex-wrap gap-1 self-start text-sm md:sticky md:top-8 md:flex-col">
          <a href="#profile" className="rounded-md px-3 py-2 font-medium hover:bg-muted">Profile</a>
          <a href="#connection" className="rounded-md px-3 py-2 font-medium hover:bg-muted">Connected account</a>
          <a href="#account" className="rounded-md px-3 py-2 font-medium hover:bg-muted">Account controls</a>
        </nav>
        <div className="min-w-0 space-y-8">
          <section id="profile" aria-labelledby="profile-heading" className="scroll-mt-8 rounded-xl border p-5 sm:p-7">
            <h2 id="profile-heading" className="text-lg font-semibold">Profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">The person behind the contributions.</p>
            <div className="mt-6 flex items-center gap-4">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="size-16 shrink-0 rounded-full border bg-muted" />
              ) : <UserRound aria-hidden="true" className="size-16 shrink-0 rounded-full bg-muted p-4 text-muted-foreground" />}
              <div className="min-w-0">
                <p className="break-words font-medium">{user.name ?? user.githubLogin}</p>
                <p className="mt-1 break-all text-sm text-muted-foreground">@{user.githubLogin}</p>
                <p className="mt-1 text-xs text-muted-foreground">Profile photo provided by GitHub</p>
              </div>
            </div>
            <ProfileForm name={user.name ?? user.githubLogin} />
          </section>
          <section id="connection" aria-labelledby="connection-heading" className="scroll-mt-8 rounded-xl border p-5 sm:p-7">
            <h2 id="connection-heading" className="text-lg font-semibold">Connected account</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your connection to the open-source community.</p>
            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg bg-muted/60 p-4">
              <GitBranch aria-hidden="true" className="size-6 shrink-0" />
              <div className="min-w-0 flex-1"><p className="text-sm font-medium">GitHub</p><p className="break-all text-sm text-muted-foreground">@{user.githubLogin}</p></div>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"><Check aria-hidden="true" className="size-3.5" />Connected</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">GitHub is used to sign you in and verify which repositories you maintain. Manage your password and sign-in security on GitHub.</p>
            <Button asChild variant="outline" className="mt-5"><a href="https://github.com/settings/security" target="_blank" rel="noopener noreferrer">GitHub security settings<ArrowUpRight aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></Button>
          </section>
          <section id="account" aria-labelledby="account-heading" className="scroll-mt-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 sm:p-7">
              <div><h2 id="account-heading" className="text-lg font-semibold">Sign out</h2><p className="mt-1 text-sm text-muted-foreground">End your session on this browser.</p></div>
              <SignOutButton redirectUrl="/"><Button variant="outline"><LogOut aria-hidden="true" />Sign out</Button></SignOutButton>
            </div>
            <DeleteAccount />
          </section>
        </div>
      </div>
    </div>
  );
}
