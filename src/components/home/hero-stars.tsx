import type { CSSProperties } from "react";

import styles from "./hero-stars.module.css";

// Fixed positions keep the server render stable and avoid a repeating grid.
const stars = Array.from({ length: 72 }, (_, index) => {
  const seed = (index + 1) * 7919;
  return {
    left: `${(seed % 997) / 10}%`,
    top: `${((seed * 37) % 991) / 10}%`,
    width: index % 9 === 0 ? 3 : index % 3 === 0 ? 2 : 1,
    height: index % 9 === 0 ? 3 : index % 3 === 0 ? 2 : 1,
    animationDelay: `${-(index % 13)}s`,
    animationDuration: `${5 + (index % 7)}s`,
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
