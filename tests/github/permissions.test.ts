import { describe, it, expect } from "vitest";
import { canClaimWithPermission } from "@/lib/github/permissions";

describe("canClaimWithPermission", () => {
  it("allows admin permission to claim", () => {
    expect(canClaimWithPermission("admin")).toBe(true);
  });

  it("allows maintain permission to claim", () => {
    expect(canClaimWithPermission("maintain")).toBe(true);
  });

  it("does not allow write-only permission to claim", () => {
    expect(canClaimWithPermission("write")).toBe(false);
  });

  it("does not allow read/triage permission to claim", () => {
    expect(canClaimWithPermission("read")).toBe(false);
    expect(canClaimWithPermission("triage")).toBe(false);
  });

  it("does not allow null/none permission to claim", () => {
    expect(canClaimWithPermission(null)).toBe(false);
    expect(canClaimWithPermission("none")).toBe(false);
  });
});
