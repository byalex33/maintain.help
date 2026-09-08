import { expect, it, vi } from "vitest";
import { organizationAccessRequired, connectGitHubOrganizationsAutomatically } from "@/lib/github/organizationAccess";

it("requests organization access only for a confirmed missing OAuth scope", () => {
  expect(organizationAccessRequired({ status: 403, response: { headers: { "x-oauth-scopes": "read:user,user:email" } } })).toBe(true);
  for (const error of [
    { status: 500 }, { status: 403 },
    { status: 403, response: { headers: { "x-oauth-scopes": "read:org" } } },
    { status: 403, response: { headers: { "x-oauth-scopes": "user:email", "x-ratelimit-remaining": "0" } } },
    { status: 403, response: { headers: { "x-oauth-scopes": "admin:org" } } },
  ]) expect(organizationAccessRequired(error)).toBe(false);
});

it("automatically connects once per account and avoids loops after returning or cancellation", async () => {
  const entries = new Map<string, string>();
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
  const connect = vi.fn().mockResolvedValue(undefined);
  await connectGitHubOrganizationsAutomatically("alice", storage, connect);
  await connectGitHubOrganizationsAutomatically("alice", storage, connect);
  expect(connect).toHaveBeenCalledTimes(1);
  await connectGitHubOrganizationsAutomatically("bob", storage, connect);
  expect(connect).toHaveBeenCalledTimes(2);
});

it("leaves manual connection available when browser storage is blocked", async () => {
  const connect = vi.fn();
  await connectGitHubOrganizationsAutomatically("alice", { getItem: () => { throw new Error("blocked"); }, setItem: vi.fn() }, connect);
  expect(connect).not.toHaveBeenCalled();
});
