"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Star, X } from "lucide-react";

const pendingSignIn = "maintain.help:sign-in-pending";

export function SignInToast() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (!isSignedIn && pathname === "/sign-in") {
        sessionStorage.setItem(pendingSignIn, "1");
      }
      if (!isSignedIn || !sessionStorage.getItem(pendingSignIn)) return;
    } catch {
      // Storage may be disabled; a notification must never interrupt sign-in.
      return;
    }

    // Wait until after navigation paints; consume only when the toast is shown.
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(pendingSignIn);
      } catch {
        return;
      }
      setVisible(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isLoaded, isSignedIn, pathname]);

  return (
    <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 md:left-auto md:w-96">
      {visible && isSignedIn ? (
        // Adapted from Opensource UI System Alert; see THIRD_PARTY_NOTICES.md.
        <div data-slot="system-alert-banner" className="pointer-events-auto relative grid grid-cols-[2.375rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 overflow-hidden rounded-[1.25rem] border border-white/70 bg-white/95 p-4 pr-12 text-neutral-950 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.10)] backdrop-blur-xl transition-[opacity,translate] duration-300 starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none motion-reduce:starting:translate-y-0 dark:border-neutral-700 dark:bg-neutral-900/95 dark:text-neutral-50">
          <div aria-hidden="true" className="row-span-3 flex size-9.5 items-center justify-center rounded-[0.625rem] bg-amber-400 shadow-sm">
            <Star className="size-5 fill-white text-white" />
          </div>
          <p className="text-[13px] font-semibold">maintain.help <span className="font-normal text-neutral-500 dark:text-neutral-400">· Signed in</span></p>
          <p className="col-start-2 text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-300">We&rsquo;re open source, give us a ⭐ to help us grow!</p>
          <a href="https://github.com/byalex33/maintain.help" target="_blank" rel="noopener noreferrer" onClick={() => setVisible(false)} className="col-start-2 mt-2 w-fit rounded-md text-sm font-semibold underline underline-offset-4 hover:text-amber-700 focus-visible:outline-2 focus-visible:outline-offset-4 dark:hover:text-amber-300">
            Star us on GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <Button type="button" aria-label="Dismiss notification" onClick={() => setVisible(false)} variant="ghost" size="icon" className="absolute top-1 right-1 size-10 rounded-full text-neutral-500 dark:text-neutral-400">
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
