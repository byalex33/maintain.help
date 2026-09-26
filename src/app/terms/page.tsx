import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return <article className="mx-auto max-w-3xl space-y-6 bg-[#f6f4ee] px-6 py-12 text-sm leading-7 [font-family:Arial,Helvetica,sans-serif] dark:bg-[#191918]">
    <h1 className="text-3xl font-semibold">Terms of service</h1>
    <p>maintain.help helps people discover public open-source projects. Use the service responsibly and respect the people who maintain those projects.</p>
    <h2 className="text-xl font-semibold">Using the directory</h2>
    <p>Repository classifications are estimates based on public activity unless identified as a verified maintainer request. They may be incomplete or outdated. Check the repository and its contribution guidance before acting on a listing.</p>
    <h2 className="text-xl font-semibold">Your account and submissions</h2>
    <p>Submit accurate information, claim only repositories you are authorized to represent, and do not use feedback or other features for spam, impersonation, harassment or attempts to disrupt the service. We may moderate listings and submissions to keep the directory useful.</p>
    <p>Maintainer requests and help tags are public. Do not include secrets, private information, or content you are not entitled to share. Use repository report controls for listing concerns.</p>
    <h2 className="text-xl font-semibold">External projects</h2>
    <p>Each repository has its own license, contribution rules and maintainers. A listing does not guarantee a project&apos;s safety, quality, availability, or willingness to accept contributions. A listing or announcement does not grant rights to external code or imply that a project endorses maintain.help.</p>
    <h2 className="text-xl font-semibold">Availability and privacy</h2>
    <p>The service and its features may change or become unavailable. Read our <Link href="/privacy" className="underline">privacy policy</Link> for information about account data and browser storage.</p>
    <p>Questions and service feedback can be raised through the <a href="https://github.com/byalex33/maintain.help" className="underline">project repository</a>.</p>
  </article>;
}
