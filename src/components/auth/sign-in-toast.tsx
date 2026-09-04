"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { CircleCheck, X } from "lucide-react";

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

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 6000);
    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 sm:left-auto sm:w-80">
      {visible && isSignedIn ? (
        <div className="pointer-events-auto flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-neutral-950 shadow-lg dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50">
          <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-green-600 dark:text-green-400" />
          <p className="flex-1 text-sm font-medium">You&rsquo;re signed in.</p>
          <button type="button" aria-label="Dismiss notification" onClick={() => setVisible(false)} className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-neutral-400 dark:hover:bg-neutral-800">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
