import type { ReactNode } from "react";

export function PageIntro({ eyebrow, title, description, children }: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-intro">
      <div className="min-w-0 max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display-title mt-4 break-words">{title}</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">{description}</p>
      </div>
      {children}
    </header>
  );
}
