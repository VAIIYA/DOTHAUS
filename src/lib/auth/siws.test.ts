import { describe, expect, it } from "vitest";
import { buildAuthMessage, isNonceValid } from "./siws";

describe("siws", () => {
  it("builds a deterministic auth message", () => {
    const message = buildAuthMessage({
      domain: "localhost:3000",
      walletAddress: "wallet123",
      nonce: "nonce123",
      issuedAt: "2026-02-20T20:00:00.000Z",
      expiresAt: "2026-02-20T20:05:00.000Z",
    });

    expect(message).toContain("Domain: localhost:3000");
    expect(message).toContain("Nonce: nonce123");
  });

  it("rejects expired or used nonces", () => {
    const now = new Date("2026-02-20T20:06:00.000Z");

    expect(
      isNonceValid({
        now,
        record: {
          nonce: "nonce123",
          walletAddress: "wallet123",
          createdAt: new Date("2026-02-20T20:00:00.000Z"),
          expiresAt: new Date("2026-02-20T20:05:00.000Z"),
          usedAt: null,
        },
      }),
    ).toBe(false);

    expect(
      isNonceValid({
        now: new Date("2026-02-20T20:01:00.000Z"),
        record: {
          nonce: "nonce123",
          walletAddress: "wallet123",
          createdAt: new Date("2026-02-20T20:00:00.000Z"),
          expiresAt: new Date("2026-02-20T20:05:00.000Z"),
          usedAt: new Date("2026-02-20T20:00:30.000Z"),
        },
      }),
    ).toBe(false);
  });
});
