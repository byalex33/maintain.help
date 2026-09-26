"use client";

import { useEffect, useRef, useState, type ComponentProps, type CSSProperties } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon, ArrowRight02Icon, BookOpen01Icon, CodeIcon, GithubIcon, GitPullRequestIcon, PaintBrush01Icon, Rocket01Icon, Task01Icon, TestTube01Icon, TranslationIcon } from "@hugeicons/core-free-icons";
import { AddRepositoryForm } from "./add-repository-form";
import { HELP_TAGS, onboardingSchema } from "@/lib/repositoryOnboarding";
import { parseGitHubRepoUrl } from "@/lib/github/parseUrl";

const icons = { DOCUMENTATION: BookOpen01Icon, DESIGN: PaintBrush01Icon, CODE: CodeIcon, PR_REVIEW: GitPullRequestIcon, ISSUE_TRIAGE: Task01Icon, TESTING: TestTube01Icon, TRANSLATION: TranslationIcon, DEVOPS_CI: Rocket01Icon };
const steps = ["Repository", "Your request", "Help tags"];
const intentions = [
  { value: "NEED_CONTRIBUTORS", title: "Contributors", detail: "Help with specific tasks" },
  { value: "NEED_COMAINTAINERS", title: "Co-maintainers", detail: "Share the ongoing work" },
  { value: "NEED_MAINTAINER", title: "A new maintainer", detail: "Someone to take the lead" },
] as const;
type Tag = typeof HELP_TAGS[number]["id"];

export function RepositoryOnboarding(props: Omit<ComponentProps<typeof AddRepositoryForm>, "onSelect">) {
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");
  const [intent, setIntent] = useState<typeof intentions[number]["value"]>("NEED_CONTRIBUTORS");
  const [message, setMessage] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const submitting = useRef(false);
  const initialRender = useRef(true);

  useEffect(() => {
    if (initialRender.current) { initialRender.current = false; return; }
    heading.current?.focus();
  }, [step, destination]);

  function advance() {
    setError(null);
    if (step === 0 && !parseGitHubRepoUrl(url)) { setError("Enter a GitHub link, such as https://github.com/owner/repo."); return; }
    if (step === 1 && !message.trim()) { setError("Tell contributors a little about what you need."); return; }
    setStep(step + 1);
  }

  async function publish() {
    if (submitting.current) return;
    const parsed = onboardingSchema.safeParse({ status: intent, message, tags });
    if (!parsed.success) { setError("Add a short request and choose at least one help tag."); return; }
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/repositories/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, onboarding: parsed.data }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || typeof data !== "object") {
        throw new Error(typeof data?.error === "string" && data.error.trim() ? data.error : "We couldn't save your repository. Please try again.");
      }
      if (typeof data.owner !== "string" || typeof data.repo !== "string") throw new Error("We couldn't confirm your listing. Please try again.");
      setDestination(`/${encodeURIComponent(data.owner)}/${encodeURIComponent(data.repo)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection lost. Please try again.");
    } finally { submitting.current = false; setPending(false); }
  }

  return (
    <section className="repo-onboarding" aria-label="Repository onboarding" aria-busy={pending}>
      <div className="onboarding-progress">
        <p>{destination ? "All set" : `Step ${step + 1} of 3`}</p>
        <ol aria-label="Progress">
          {steps.map((label, index) => <li key={label} aria-current={!destination && step === index ? "step" : undefined} data-complete={destination || index <= step ? "true" : undefined}><span className="sr-only">{label}</span></li>)}
        </ol>
      </div>
      {destination ? (
        <div className="onboarding-success">
          <div className="onboarding-confetti" aria-hidden="true">
            {Array.from({ length: 32 }, (_, i) => <i key={i} style={{ "--x": `${Math.cos(i * 2.4) * (90 + i * 4)}px`, "--y": `${-90 - (i % 8) * 23}px`, "--r": `${i * 47}deg`, "--delay": `${(i % 4) * 35}ms`, backgroundColor: ["#a95836", "#53634c", "#b29256", "#747a83"][i % 4] } as CSSProperties} />)}
          </div>
          <div className="onboarding-success-icon"><HugeiconsIcon icon={Rocket01Icon} size={32} /></div>
          <p className="onboarding-eyebrow">Ready for a helping hand</p>
          <h2 ref={heading} tabIndex={-1}>Your repository is listed.</h2>
          <p>Your request and help tags are live. Give contributors a place to start.</p>
          <Link className="onboarding-button" href={destination}>View repository <HugeiconsIcon icon={ArrowRight02Icon} size={18} /></Link>
        </div>
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); if (step < 2) advance(); else void publish(); }}>
          <div key={step} className="onboarding-step">
            <p className="onboarding-eyebrow">{steps[step]}</p>
            <h2 ref={heading} tabIndex={-1}>{["Start with your repository.", "What are you looking for?", "Where could you use a hand?"][step]}</h2>
            <p className="onboarding-description">{["Add a public GitHub project you own or help maintain.", "Tell people how they can make a useful contribution.", "Choose the kinds of help you need. Pick as many as you like."][step]}</p>
            {step === 0 && <>
              <label className="onboarding-label" htmlFor="repository-url">GitHub link</label>
              <div className="onboarding-url"><HugeiconsIcon icon={GithubIcon} size={22} /><input id="repository-url" name="url" autoComplete="url" spellCheck={false} placeholder="https://github.com/owner/repo" value={url} onChange={(e) => setUrl(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "onboarding-error" : undefined} /></div>
              <details className="onboarding-picker"><summary>Or choose from your repositories</summary><div className="pt-4"><AddRepositoryForm {...props} onSelect={(value) => { setUrl(value); setError(null); setStep(1); }} /></div></details>
            </>}
            {step === 1 && <>
              <fieldset className="onboarding-intentions"><legend className="onboarding-label">I&apos;m looking for</legend>{intentions.map((item) => <label key={item.value} data-selected={intent === item.value}><input type="radio" name="intent" value={item.value} checked={intent === item.value} onChange={() => setIntent(item.value)} /><span><strong>{item.title}</strong><small>{item.detail}</small></span></label>)}</fieldset>
              <label className="onboarding-label" htmlFor="help-message">A note to future contributors</label>
              <textarea id="help-message" name="message" rows={4} maxLength={2000} placeholder="We'd love help improving our getting-started guide and reviewing a few open pull requests…" value={message} onChange={(e) => setMessage(e.target.value)} aria-invalid={!!error} aria-describedby={error ? "onboarding-error" : "message-hint"} />
              <p id="message-hint" className="onboarding-hint">This will appear on your repository page. <span>{message.length}/2000</span></p>
            </>}
            {step === 2 && <>
              <fieldset className="onboarding-tags" disabled={pending}><legend className="sr-only">Help tags</legend>{HELP_TAGS.map((tag) => <label key={tag.id} data-selected={tags.includes(tag.id)}><input type="checkbox" checked={tags.includes(tag.id)} onChange={() => setTags((current) => current.includes(tag.id) ? current.filter((value) => value !== tag.id) : [...current, tag.id])} /><HugeiconsIcon icon={icons[tag.id]} size={24} strokeWidth={1.5} /><span><strong>{tag.label}</strong><small>{tag.description}</small></span></label>)}</fieldset>
              <div className="onboarding-summary"><HugeiconsIcon icon={GithubIcon} size={18} /><span>{parseGitHubRepoUrl(url)?.owner}/{parseGitHubRepoUrl(url)?.repo}</span><span>{tags.length} selected</span></div>
              <p className="onboarding-hint">Publishing verifies your GitHub access and makes this request public.</p>
            </>}
            {error && <p id="onboarding-error" role="alert" className="onboarding-error">{error}</p>}
            {pending && <div role="status" className="onboarding-saving"><p>Checking GitHub and saving your request…</p><div /><div /><span>This can take a minute. Keep this page open.</span></div>}
          </div>
          <div className="onboarding-actions">
            {step > 0 ? <button type="button" className="onboarding-back" disabled={pending} onClick={() => { setError(null); setStep(step - 1); }}><HugeiconsIcon icon={ArrowLeft02Icon} size={18} />Back</button> : <span className="onboarding-hint">A few details. A useful first step.</span>}
            <button type="submit" className="onboarding-button" disabled={pending || (step === 2 && tags.length === 0)}>{pending ? "Publishing…" : step === 2 ? "Publish repository" : "Continue"}<HugeiconsIcon icon={step === 2 ? Rocket01Icon : ArrowRight02Icon} size={18} /></button>
          </div>
        </form>
      )}
      <p className="onboarding-legal"><Link href="/terms">Terms of service</Link><span>·</span><Link href="/privacy">Privacy policy</Link></p>
    </section>
  );
}
