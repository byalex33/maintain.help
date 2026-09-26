"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

// Adapted from UI Lab Notification Bell; see THIRD_PARTY_NOTICES.md.
export type BellNotification = { id: string; unread: boolean; content: React.ReactNode };

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const ITEM = { type: "spring", duration: 0.35, bounce: 0 } as const;
// A little bounce is the point here: the badge should feel like it landed.
const BADGE_IN = { type: "spring", duration: 0.3, bounce: 0.35 } as const;
const BADGE_OUT = { duration: 0.15, ease: EASE_OUT } as const;
// Five swings that die away, so it reads as ringing rather than a twitch.
const RING: Keyframe[] = [
  { rotate: "0deg" }, { rotate: "14deg" }, { rotate: "-12deg" }, { rotate: "8deg" },
  { rotate: "-5deg" }, { rotate: "2deg" }, { rotate: "0deg" },
];

export function NotificationBell({
  notifications,
  onRead,
  header,
  empty,
  footer,
  describe,
  className,
}: {
  /** Newest first. Read state comes from the caller. */
  notifications: BellNotification[];
  /** Called with the unread ids that were shown when the panel closes. */
  onRead: (ids: string[]) => void;
  header?: React.ReactNode;
  empty?: React.ReactNode;
  footer?: React.ReactNode;
  /** Screen-reader text announced when a new notification arrives. */
  describe?: (notification: BellNotification) => string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);
  const newestId = useRef(notifications.find((n) => n.unread)?.id);
  const panelId = useId();

  const unread = notifications.filter((n) => n.unread);
  // Opening the panel is reading, so the badge leaves at once. The dots stay
  // until it closes, so you can still see which ones were new.
  const badge = open ? 0 : unread.length;
  const label = badge > 9 ? "9+" : String(badge);

  const onReadRef = useRef(onRead);
  const unreadRef = useRef(unread);
  useEffect(() => {
    onReadRef.current = onRead;
    unreadRef.current = unread;
  });

  const close = () => {
    setOpen(false);
    if (unreadRef.current.length) onReadRef.current(unreadRef.current.map((n) => n.id));
  };

  useEffect(() => {
    const newest = notifications.find((n) => n.unread);
    if (!newest || newest.id === newestId.current) return;
    newestId.current = newest.id;
    // Written straight to the DOM so announcing costs no render.
    if (liveRef.current && describe) liveRef.current.textContent = describe(newest);
    const icon = iconRef.current;
    if (!icon || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ring = icon.animate(RING, { duration: 500, easing: "ease-in-out" });
    return () => ring.cancel();
  }, [notifications, describe]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      if (unreadRef.current.length) onReadRef.current(unreadRef.current.map((n) => n.id));
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={rootRef}
        className={cn("relative inline-flex", className)}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !open) return;
          close();
          bellRef.current?.focus();
        }}
      >
        <button
          ref={bellRef}
          type="button"
          aria-label={badge > 0 ? `Notifications, ${unread.length} unread` : "Notifications"}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => (open ? close() : setOpen(true))}
          className="relative flex size-9 touch-manipulation select-none items-center justify-center rounded-md border border-border bg-background outline-hidden transition-[scale,background-color] duration-150 ease-out hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:scale-[0.96] motion-reduce:transition-none"
        >
          {/* Swings from where a bell hangs, not from its middle. */}
          <Bell ref={iconRef} aria-hidden="true" className="size-4 origin-[50%_12%]" />
          <AnimatePresence initial={false}>
            {badge > 0 && (
              <motion.span
                key="badge"
                aria-hidden="true"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: BADGE_IN }}
                exit={{ scale: 0.6, opacity: 0, transition: BADGE_OUT }}
                // The page-coloured ring cuts the badge out of the button.
                className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 overflow-hidden rounded-full bg-rose-600 px-1.5 text-xs font-semibold leading-5 text-white tabular-nums ring-2 ring-background"
              >
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={label}
                    className="col-start-1 row-start-1 text-center"
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.2, ease: EASE_OUT }}
                  >
                    {label}
                  </motion.span>
                </AnimatePresence>
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Out of flow and hanging from the bell, so opening it moves nothing else. */}
        <div
          id={panelId}
          role="region"
          aria-label="Notifications"
          inert={!open}
          // Following a link in the panel reads it, like clicking away does.
          onClick={(event) => { if ((event.target as Element).closest("a")) close(); }}
          className={cn(
            "fixed inset-x-4 top-16 z-40 origin-top rounded-[20px] border border-border bg-background p-2 shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-[340px] sm:origin-top-right",
            "transition-[opacity,scale,translate,visibility] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-[opacity,visibility]",
            open
              ? "visible translate-y-0 scale-100 opacity-100 duration-150"
              : "invisible -translate-y-1 scale-[0.97] opacity-0 duration-100 motion-reduce:translate-y-0 motion-reduce:scale-100",
          )}
        >
          {header}
          <SmoothHeight>
            {notifications.length ? (
              <ul className="max-h-[min(24rem,60vh)] overflow-y-auto">
                <AnimatePresence initial={false} mode="popLayout">
                  {notifications.map((n) => (
                    <motion.li
                      key={n.id}
                      layout="position"
                      initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.15, ease: EASE_OUT } }}
                      transition={ITEM}
                      // 20px panel radius minus its 8px padding.
                      className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-muted"
                    >
                      <span
                        aria-hidden="true"
                        // 6px centres the 8px dot on the first 20px line.
                        className={cn("mt-1.5 size-2 shrink-0 rounded-full bg-rose-600 transition-opacity duration-200 ease-out", !n.unread && "opacity-0")}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        {n.unread ? <span className="sr-only">Unread: </span> : null}
                        {n.content}
                      </span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            ) : empty}
          </SmoothHeight>
          {footer}
        </div>

        <span ref={liveRef} className="sr-only" aria-live="polite" />
      </div>
    </MotionConfig>
  );
}

// Follows its content's height with a spring instead of jumping, so the
// panel's bottom edge glides down when a row arrives.
function SmoothHeight({ children }: { children: React.ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setHeight(entry.borderBoxSize[0].blockSize));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div initial={false} animate={{ height }} transition={ITEM} className="overflow-hidden">
      <div ref={inner}>{children}</div>
    </motion.div>
  );
}
