import { describe, expect, it } from "vitest";
import { getRepositoryActivity } from "@/lib/repositoryActivity";

const empty = { owner: "example", name: "project", pushedAt: null, latestReleaseAt: null, latestReleaseTag: null, statusHistory: [] };

describe("repository activity", () => {
  it("does not invent milestones for missing data", () => {
    expect(getRepositoryActivity(empty)).toEqual([]);
    expect(getRepositoryActivity({ ...empty, latestReleaseTag: "v1" })).toEqual([]);
  });

  it("interleaves GitHub milestones and recorded classifications newest first without mutating history", () => {
    const statusHistory = [
      { id: "old", status: "HEALTHY" as const, reason: "Initial analysis", createdAt: new Date("2026-01-01"), verified: false },
      { id: "new", status: "SEEKING_MAINTAINERS" as const, reason: "Maintainer request", createdAt: new Date("2026-04-01"), verified: true },
    ];
    const events = getRepositoryActivity({ ...empty, statusHistory, pushedAt: new Date("2026-03-01"), latestReleaseAt: new Date("2026-02-01"), latestReleaseTag: "v1/next#2" });
    expect(events.map((event) => event.id)).toEqual(["status-new", "latest-push", "latest-release", "status-old"]);
    expect(statusHistory.map((status) => status.id)).toEqual(["old", "new"]);
    expect(events[0].description).toBe("Verified classification. Maintainer request");
    expect(events[3].description).toBe("Inferred classification. Initial analysis");
    expect(events[2].href).toBe("https://github.com/example/project/releases/tag/v1%2Fnext%232");
  });

  it("supports releases without tags and classifications without reasons", () => {
    const events = getRepositoryActivity({ ...empty, latestReleaseAt: new Date("2026-02-01"), statusHistory: [
      { id: "status", status: "HEALTHY", reason: null, createdAt: new Date("2026-01-01"), verified: false },
    ] });
    expect(events[0].href).toBe("https://github.com/example/project/releases");
    expect(events[0].title).toBe("Latest release published");
    expect(events[1].description).toBe("Inferred classification.");
  });
});
