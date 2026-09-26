import type { CSSProperties } from "react";

import styles from "./hero-stars.module.css";

// Mix each sample independently so positions have no visible arithmetic pattern.
// A fixed seed keeps the server output identical across renders.
function starRandom(sample: number) {
  let value = (sample + 0x6d2b79f5) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 4294967296;
}

const stars = Array.from({ length: 72 }, (_, index) => {
  const sample = index * 5;
  const size = 1 + starRandom(sample + 2) ** 3 * 2;
  return {
    left: `${starRandom(sample) * 100}%`,
    top: `${starRandom(sample + 1) * 100}%`,
    width: size,
    height: size,
    animationDelay: `${-starRandom(sample + 3) * 13}s`,
    animationDuration: `${5 + starRandom(sample + 4) * 7}s`,
  } satisfies CSSProperties;
});

export function HeroStars() {
  return (
    <div className={styles.sky} aria-hidden="true">
      {stars.map((style, index) => (
        <span key={index} className={styles.star} style={style} />
      ))}
      <span className={styles.meteor} />
      <span className={styles.meteor} />
      <span className={styles.meteor} />
    </div>
  );
}
