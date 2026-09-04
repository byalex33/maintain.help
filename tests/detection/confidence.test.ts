import { describe, it, expect } from "vitest";
import { deriveInferredConfidence, deriveHealthyConfidence } from "@/lib/detection/confidence";

describe("deriveInferredConfidence", () => {
  it("returns LOW just above the inference threshold", () => {
    expect(deriveInferredConfidence(20)).toBe("LOW");
  });
  it("returns MEDIUM at the medium threshold", () => {
    expect(deriveInferredConfidence(40)).toBe("MEDIUM");
  });
  it("returns HIGH at the high threshold", () => {
    expect(deriveInferredConfidence(70)).toBe("HIGH");
  });
  it("returns HIGH at the maximum score", () => {
    expect(deriveInferredConfidence(100)).toBe("HIGH");
  });
});

describe("deriveHealthyConfidence", () => {
  it("is HIGH when the pressure score is near zero", () => {
    expect(deriveHealthyConfidence(0)).toBe("HIGH");
  });
  it("degrades as the pressure score rises even while still healthy", () => {
    expect(deriveHealthyConfidence(10)).toBe("MEDIUM");
    expect(deriveHealthyConfidence(19)).toBe("LOW");
  });
});
