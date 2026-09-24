"use client";

import { X } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Adapted from UI Lab Announcement Banner; see THIRD_PARTY_NOTICES.md.
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
// The iOS drawer curve for the height: quick to start, long soft settle, so
// the page below glides rather than lurches.
const DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)";

export function AnnouncementBanner({
  open,
  onDismiss,
  icon,
  action,
  label = "Announcement",
  className,
  children,
}: {
  open: boolean;
  onDismiss: () => void;
  icon?: React.ReactNode;
  /** A link or button shown after the message. */
  action?: React.ReactNode;
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  // The first appearance slides down from above; later ones (after a dismiss)
  // reverse the dismissal instead: open the space, then fade in.
  const [shown, setShown] = useState(open);
  const [firstShow, setFirstShow] = useState(true);
  if (open !== shown) {
    setShown(open);
    if (!open) setFirstShow(false);
  }

  const rows = reduceMotion
    ? "none"
    : open
      ? `grid-template-rows 280ms ${DRAWER}`
      : // Waits for the content to mostly fade, so the text never gets
        // squeezed while it's still readable.
        `grid-template-rows 240ms ${DRAWER} 80ms`;

  const content = open
    ? reduceMotion
      ? `opacity 200ms ${EASE}`
      : firstShow
        ? `translate 280ms ${DRAWER}, opacity 200ms ${EASE}, filter 200ms ${EASE}`
        : `opacity 200ms ${EASE} 120ms, filter 200ms ${EASE} 120ms`
    : `opacity 120ms ${EASE}, filter 120ms ${EASE}`;

  return (
    <div className="grid" style={{ gridTemplateRows: open ? "1fr" : "0fr", transition: rows }}>
      <div className="min-h-0 overflow-hidden">
        <section
          aria-label={label}
          inert={!open}
          tabIndex={-1}
          className={cn("flex min-h-11 items-center gap-2.5 bg-foreground py-1 pl-4 pr-1.5 text-sm text-background outline-hidden", className)}
          style={{
            opacity: open ? 1 : 0,
            filter: open || reduceMotion ? "blur(0px)" : "blur(2px)",
            translate: !open && firstShow && !reduceMotion ? "0 -100%" : "0 0",
            transition: content,
          }}
        >
          {icon ? <span aria-hidden="true" className="flex shrink-0">{icon}</span> : null}
          <p className="min-w-0 truncate">{children}</p>
          {action}
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={onDismiss}
            className={cn(
              "relative ml-auto flex size-8 shrink-0 touch-manipulation select-none items-center justify-center rounded-full text-background/70 outline-hidden transition-[scale,color,background-color] duration-150 ease-out hover:bg-background/15 hover:text-background focus-visible:outline-2 focus-visible:outline-background active:scale-[0.96] motion-reduce:transition-[color,background-color]",
              // Grows the hit area to 40px without growing the circle.
              "after:absolute after:-inset-1 after:rounded-full",
            )}
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </section>
      </div>
    </div>
  );
}
