import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), upsert: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn(), revalidate: vi.fn(), cookie: vi.fn() }));
vi.mock("@/lib/auth", async (original) => ({ ...await original<typeof import("@/lib/auth")>(), auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: { announcement: { upsert: mocks.upsert, updateMany: mocks.updateMany, findUnique: mocks.findUnique } } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie }) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("Not found"); } }));

import { saveAnnouncement } from "@/app/admin/announcements/actions";
import AnnouncementsPage from "@/app/admin/announcements/page";
import { SiteAnnouncement } from "@/components/layout/site-announcement";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { announcementSchema, isAnnouncementUrl } from "@/lib/announcements";

const state = { error: null, success: null };
function form(values: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ intent: "publish", message: "New contributor guides are available.", linkLabel: "Read the guides", linkUrl: "/explore", ...values })) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ADMIN_GITHUB_IDS", "123");
  mocks.auth.mockResolvedValue({ user: { id: "admin", githubId: "123" } });
  mocks.findUnique.mockResolvedValue(null);
});

describe("admin publishing", () => {
  it("rejects anonymous users and non-admins before reading or writing", async () => {
    for (const session of [null, { user: { githubId: "456", githubLogin: "admin" } }]) {
      mocks.auth.mockResolvedValue(session);
      await expect(AnnouncementsPage()).rejects.toThrow("Not found");
      for (const intent of ["publish", "unpublish"]) expect((await saveAnnouncement(state, form({ intent }))).error).toBe("Admin access is required.");
    }
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("publishes a validated message and gives every publication a fresh dismissal revision", async () => {
    expect((await saveAnnouncement(state, form({ message: "  A new update  " }))).success).toBe("Announcement published.");
    const first = mocks.upsert.mock.calls[0][0];
    expect(first.where).toEqual({ id: "site" });
    expect(first.create).toEqual({ id: "site", ...first.update });
    expect(first.update).toMatchObject({ message: "A new update", linkLabel: "Read the guides", linkUrl: "/explore", published: true });
    await saveAnnouncement(state, form());
    expect(mocks.upsert.mock.calls[1][0].update.revision).not.toBe(first.update.revision);
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
  });

  it("allows messages without links and unpublishes without deleting the message", async () => {
    await saveAnnouncement(state, form({ linkLabel: "", linkUrl: "" }));
    expect(mocks.upsert.mock.calls[0][0].update).toMatchObject({ linkLabel: null, linkUrl: null });
    await saveAnnouncement(state, form({ intent: "unpublish", message: "" }));
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: "site" }, data: { published: false } });
  });

  it("rejects malformed submissions and unsafe links without writing", async () => {
    const invalidValues: Record<string, string>[] = [{ intent: "delete" }, { message: "  " }, { message: "a".repeat(241) }, { linkLabel: "" }, { linkUrl: "javascript:alert(1)" }, { linkLabel: "a".repeat(61) }, { linkUrl: "https://example.com/" + "a".repeat(2048) }];
    for (const values of invalidValues) {
      expect((await saveAnnouncement(state, form(values))).error).toBeTruthy();
    }
    const file = form();
    file.set("message", new Blob(["hello"]), "message.txt");
    expect((await saveAnnouncement(state, file)).error).toBeTruthy();
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it("reports storage failures without claiming success or exposing database errors", async () => {
    mocks.upsert.mockRejectedValue(new Error("secret database details"));
    expect(await saveAnnouncement(state, form())).toEqual({ error: "The announcement could not be saved. Please try again.", success: null });
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});

describe("public banner", () => {
  const announcement = { message: "An update", linkLabel: "Read more", linkUrl: "/explore", revision: "new-revision" };

  it("only queries published content and omits empty or previously dismissed banners", async () => {
    expect(await SiteAnnouncement()).toBeNull();
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { id: "site", published: true }, select: { message: true, linkLabel: true, linkUrl: true, revision: true } });
    mocks.findUnique.mockResolvedValue(announcement);
    mocks.cookie.mockReturnValue({ value: announcement.revision });
    expect(await SiteAnnouncement()).toBeNull();
    mocks.cookie.mockReturnValue({ value: "old-revision" });
    expect(renderToStaticMarkup(await SiteAnnouncement())).toContain("An update");
  });

  it("keeps the site available if the optional announcement cannot load", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findUnique.mockRejectedValue(new Error("database unavailable"));
    expect(await SiteAnnouncement()).toBeNull();
    expect(log).toHaveBeenCalledWith("Unable to load the site announcement.");
    log.mockRestore();
  });

  it("escapes content, names the region and close button, and omits unsafe stored links", () => {
    const html = renderToStaticMarkup(createElement(AnnouncementBanner, { announcement: { ...announcement, message: "<script>alert(1)</script>", linkUrl: "javascript:alert(1)" } }));
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('aria-label="Announcement"');
    expect(html).toContain('aria-label="Dismiss announcement"');
  });
});

it("accepts only safe announcement destinations", () => {
  for (const url of ["/explore", "/find-a-project?q=typescript", "https://example.com/news#update"]) expect(isAnnouncementUrl(url)).toBe(true);
  for (const url of ["//evil.test", "/\\evil.test", "javascript:alert(1)", "data:text/html,test", "http://example.com", "https://user:pass@example.com", "https://example.com\n", "https://example.com/a b"]) expect(isAnnouncementUrl(url)).toBe(false);
  expect(announcementSchema.safeParse({ message: "Hi", linkLabel: "", linkUrl: "" }).success).toBe(true);
});
