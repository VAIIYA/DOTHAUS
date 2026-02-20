import { describe, expect, it } from "vitest";
import { normalizeStatDelta } from "./normalization";

describe("normalizeStatDelta", () => {
  it("returns numbers for valid numeric values", () => {
    expect(normalizeStatDelta("2.5")).toBe(2.5);
    expect(normalizeStatDelta(3)).toBe(3);
  });

  it("falls back to 0 for invalid values", () => {
    expect(normalizeStatDelta(undefined)).toBe(0);
    expect(normalizeStatDelta("abc")).toBe(0);
  });
});
