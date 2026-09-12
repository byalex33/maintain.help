import Link from "next/link";
import { Compass, Plus, Search, UserRound } from "lucide-react";

import { AccountMenu } from "@/components/layout/account-menu";
import { auth, isAdminLogin } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="mx-auto flex min-h-20 max-w-6xl flex-wrap items-center gap-4 px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-neutral-900 text-sm text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900">
            m.
          </span>
          maintain.help
        </Link>

        <nav aria-label="Main navigation" className="order-last flex w-full flex-wrap items-center gap-0 border-t border-border pt-3 text-xs text-muted-foreground md:order-none md:ml-6 md:w-auto md:gap-1 md:border-0 md:pt-0 md:text-sm [&_a]:px-2 [&_svg]:size-3.5">
          <Link href="/explore" className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-neutral-50">
            <Compass className="size-4" />
            Explore
          </Link>
          <Link href="/find-a-project" className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-neutral-50">
            <Search className="size-4" />
            Find a project
          </Link>
          {session?.user ? <Link href="/profile" className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 hover:bg-muted hover:text-foreground">
            <UserRound aria-hidden="true" className="size-4" />Your profile
          </Link> : null}
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {session?.user ? (
            <Button asChild variant="outline" size="icon">
              <Link href="/add" aria-label="Add a repository" title="Add a repository">
                <Plus aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          ) : null}

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
