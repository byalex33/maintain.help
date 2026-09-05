import Link from "next/link";
import { Compass, Plus, Search } from "lucide-react";

import { AccountMenu } from "@/components/layout/account-menu";
import { auth, isAdminLogin } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center gap-2 px-4 py-2 sm:gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-6 items-center justify-center rounded-md bg-neutral-900 text-xs text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900">
            m.
          </span>
          maintain.help
        </Link>

        <nav className="ml-2 hidden items-center gap-1 text-sm text-neutral-600 sm:flex dark:text-neutral-400">
          <Link href="/explore" className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-neutral-50">
            <Compass className="size-4" />
            Explore
          </Link>
          <Link href="/find-a-project" className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-neutral-50">
            <Search className="size-4" />
            Find a project
          </Link>
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/add">
              <Plus className="size-4" />
              Add repository
            </Link>
          </Button>

          {session?.user ? (
            <AccountMenu username={session.user.githubLogin} image={session.user.image} isAdmin={isAdminLogin(session.user.githubLogin)} />
          ) : (
            <Button asChild size="sm">
              <Link href="/sign-in">Sign in with GitHub</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
