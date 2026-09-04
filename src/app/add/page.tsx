import type { Metadata } from "next";

import { AddRepositoryForm } from "@/components/add/add-repository-form";

export const metadata: Metadata = {
  title: "Add a repository",
  description: "Add a GitHub repository to maintain.help for analysis.",
};

export default function AddRepositoryPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Add a repository</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Paste a GitHub repository URL. If it&rsquo;s already indexed we&rsquo;ll take you straight to its page —
        otherwise we&rsquo;ll analyze it and create one.
      </p>
      <div className="mt-6">
        <AddRepositoryForm />
      </div>
    </div>
  );
}
