"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import styles from "./hero-headline.module.css";

// Adapted from UI Lab Typewriter. See THIRD_PARTY_NOTICES.md.
const PHRASES = [
  "your next project.",
  "your kind of people.",
  "fellow maintainers.",
  "a place to contribute.",
];
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeToMotion(onChange: () => void) {
  const media = window.matchMedia(MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const getReducedMotion = () => window.matchMedia(MOTION_QUERY).matches;
const getServerMotion = () => true;

export function HeroHeadline() {
  const reducedMotion = useSyncExternalStore(subscribeToMotion, getReducedMotion, getServerMotion);
  const [frame, setFrame] = useState({ word: 0, length: PHRASES[0].length, phase: "hold" });

  useEffect(() => {
    if (reducedMotion) return;
    const delay = frame.phase === "hold" ? 2400 : frame.phase === "select" ? 620 :
      62 + (Math.sin(frame.length * 1.9 + frame.word * 2.7) * 0.5 + 0.5) * 64;
    const timer = setTimeout(() => {
      setFrame((current) => {
        if (current.phase === "hold") return { ...current, phase: "select" };
        if (current.phase === "select") {
          return { word: (current.word + 1) % PHRASES.length, length: 1, phase: "type" };
        }
        const length = current.length + 1;
        return { ...current, length, phase: length >= PHRASES[current.word].length ? "hold" : "type" };
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [frame, reducedMotion]);

  const phrase = reducedMotion ? PHRASES[0] : PHRASES[frame.word].slice(0, frame.length);

  return (
    <div className="relative w-full max-w-4xl">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
        <span className="sr-only">Find your next project, your kind of people, fellow maintainers, or a place to contribute.</span>
        <span aria-hidden="true" className={styles.words} data-phase={reducedMotion ? "hold" : frame.phase}>
          {/* Reserve every phrase, including its wrapped height on small screens. */}
          {PHRASES.map((word) => <span key={word} className={styles.reserve}>Find {word}<span className={styles.caret} /></span>)}
          <span className={styles.current}>
            Find{" "}
            <span className={styles.text}>
              <span className={styles.selection} />
              <span className={styles.letters}>
                {Array.from(phrase).map((letter, index) => <span key={`${reducedMotion ? 0 : frame.word}-${index}`} className={styles.letter}>{letter}</span>)}
              </span>
            </span>
            <span className={styles.caret} />
          </span>
        </span>
      </h1>
    </div>
  );
}
