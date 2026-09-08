"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { Bookmark, ChevronDown, LogOut, Settings, UserRound, ShieldCheck } from "lucide-react";

export function AccountMenu({ username, image, isAdmin = false }: { username: string; image: string | null; isAdmin?: boolean }) {
  const menu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <details ref={menu} className="relative">
      <summary aria-label={`Account menu for ${username}`} className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-neutral-800 [&::-webkit-details-marker]:hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="size-6 rounded-full" />
        ) : <UserRound aria-hidden="true" className="size-6" />}
        <span className="max-w-32 truncate">{username}</span>
        <ChevronDown aria-hidden="true" className="size-3.5 text-neutral-500" />
      </summary>
      <nav aria-label="Account" onClick={() => { if (menu.current) menu.current.open = false; }} className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-neutral-200 bg-white p-1.5 text-sm shadow-lg dark:border-neutral-800 dark:bg-neutral-950 [&_a]:flex [&_a]:items-center [&_a]:gap-2 [&_a]:rounded-md [&_a]:px-3 [&_a]:py-2 [&_a:hover]:bg-neutral-100 dark:[&_a:hover]:bg-neutral-800">
        <Link href="/saved"><Bookmark aria-hidden="true" className="size-4" />Save</Link>
        <Link href="/settings"><Settings aria-hidden="true" className="size-4" />Settings</Link>
        {isAdmin ? <Link href="/admin"><ShieldCheck aria-hidden="true" className="size-4" />Admin</Link> : null}
        <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />
        <SignOutButton redirectUrl="/">
          <Button type="button" variant="ghost" className="w-full justify-start px-3"><LogOut aria-hidden="true" className="size-4" />Sign Out</Button>
        </SignOutButton>
      </nav>
    </details>
  );
}
