import { isGitHubProvider } from "@/lib/github/provider";
import "server-only";
import { cache } from "react";
import { auth as clerkAuth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

class AccountLinkConflictError extends Error {}

const githubIdentity = cache(async () => {
  const { userId } = await clerkAuth();
  if (!userId) return null;
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const accounts = user.externalAccounts.filter((account) =>
    isGitHubProvider(account.provider) &&
    account.verification?.status === "verified"
  );
  // Fail closed: permissions must belong to one unambiguous, verified GitHub identity.
  if (accounts.length !== 1 || !/^\d+$/.test(accounts[0].providerUserId) || !accounts[0].username) return null;
  const account = accounts[0];
  return {
    clerkId: userId,
    externalAccountId: account.id,
    githubId: account.providerUserId,
    githubLogin: account.username!,
    name: user.fullName ?? account.username,
    image: user.imageUrl,
  };
});

type GitHubIdentity = NonNullable<Awaited<ReturnType<typeof githubIdentity>>>;

async function linkUser({ clerkId, githubId, githubLogin, name, image }: GitHubIdentity) {
  return db.$transaction(async (tx) => {
    // Never link by a mutable username or an email supplied by another provider.
    const existing = await tx.user.upsert({
      where: { githubId },
      create: { clerkId, githubId, githubLogin, name, image },
      update: { githubLogin, name, image },
    });
    if (existing.clerkId && existing.clerkId !== clerkId) {
      throw new AccountLinkConflictError("This GitHub account is already linked to another Clerk user.");
    }
    return existing.clerkId ? existing : tx.user.update({ where: { id: existing.id }, data: { clerkId } });
  }).catch((error: unknown) => {
    // Catch outside the transaction so conflicting profile changes are rolled back.
    if (error instanceof AccountLinkConflictError) return null;
    throw error;
  });
}

/** Clerk authenticates; our stable local ID keeps claims, feedback and saves intact. */
export const auth = cache(async () => {
  const identity = await githubIdentity();
  if (!identity) return null;
  const { clerkId, githubId, githubLogin, name, image } = identity;
  // Most requests find an unchanged, linked profile; only write when something differs.
  const current = await db.user.findUnique({ where: { githubId } });
  if (current?.clerkId && current.clerkId !== clerkId) return null;
  const unchanged = current?.clerkId === clerkId && current.githubLogin === githubLogin && current.name === name && current.image === image;
  const user = unchanged ? current : await linkUser(identity);
  if (!user) return null;
  return { user: { id: user.id, githubId, githubLogin, name: user.name, image: user.image } };
});

/**
 * Fetch only the current user's matching GitHub token from Clerk, server-side.
 * It is never stored in our database, returned to a client, or replaced by the analysis token.
 */
export async function getGitHubAccessToken(userId: string): Promise<string | null> {
  const session = await auth();
  if (!session || session.user.id !== userId) return null;
  const identity = await githubIdentity();
  if (!identity) return null;
  try {
    const client = await clerkClient();
    const { data } = await client.users.getUserOauthAccessToken(identity.clerkId, "github");
    return data.find((token) => token.externalAccountId === identity.externalAccountId)?.token ?? null;
  } catch {
    // Revocation/provider outages must not grant maintainer permissions or leak tokens in errors.
    return null;
  }
}

/** Admin rights follow the immutable numeric GitHub ID, never a reusable username. */
export function isAdminGitHubId(githubId: string | null | undefined): boolean {
  if (!githubId || !/^\d+$/.test(githubId)) return false;
  return (process.env.ADMIN_GITHUB_IDS ?? "")
    .split(",")
    .some((admin) => admin.trim() === githubId);
}
