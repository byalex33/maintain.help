import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return <article className="mx-auto max-w-3xl space-y-6 bg-[#f6f4ee] px-6 py-12 text-sm leading-7 [font-family:Arial,Helvetica,sans-serif] dark:bg-[#191918]">
    <h1 className="text-3xl font-semibold">Privacy policy</h1>
    <p>maintain.help uses public GitHub repository information to help people find open-source projects that need help.</p>
    <h2 className="text-xl font-semibold">Account and contribution data</h2>
    <p>Signing in uses Clerk and GitHub. We store your linked account identifiers, GitHub username, display name and avatar, along with actions you take on the site such as saves, upvotes, repository submissions, feedback and maintainer claims. GitHub access tokens are retrieved through Clerk on the server when needed to check access.</p>
    <h2 className="text-xl font-semibold">Browser storage</h2>
    <p>Authentication uses browser cookies. When you dismiss an announcement, we store its version in a cookie called maintain-announcement-dismissed for up to one year. It lets us keep that announcement hidden while showing a later update. You can clear it in your browser settings.</p>
    <h2 className="text-xl font-semibold">Your choices</h2>
    <p>You can edit your profile or request account deletion in <Link href="/settings" className="underline">Settings</Link>. Public repository information remains available independently of your account. Clerk and GitHub handle information under their own privacy policies.</p>
    <p>For questions about the service, contact the project through its <a href="https://github.com/byalex33/maintain.help" className="underline">GitHub repository</a>. Do not post credentials or other private information in public issues.</p>
  </article>;
}
