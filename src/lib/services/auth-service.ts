import { randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { authNonces } from "@/db/schema";
import { buildAuthMessage, createNonceExpiry, isNonceValid, type NonceRecord } from "@/lib/auth/siws";

interface IssueNonceInput {
  walletAddress: string;
  domain: string;
}

export interface IssuedNonce {
  nonce: string;
  message: string;
  expiresAt: string;
}

function nonceToRecord(row: typeof authNonces.$inferSelect | undefined): NonceRecord | undefined {
  if (!row) return undefined;
  return {
    nonce: row.nonce,
    walletAddress: row.walletAddress,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt ?? null,
  };
}

export class AuthService {
  static async issueNonce({ walletAddress, domain }: IssueNonceInput): Promise<IssuedNonce> {
    const now = new Date();
    const expiresAt = createNonceExpiry(now);
    const nonce = randomBytes(16).toString("hex");

    await db.insert(authNonces).values({
      nonce,
      walletAddress,
      createdAt: now,
      expiresAt,
      usedAt: null,
    }).run();

    return {
      nonce,
      message: buildAuthMessage({
        domain,
        walletAddress,
        nonce,
        issuedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      }),
      expiresAt: expiresAt.toISOString(),
    };
  }

  static async getValidNonce(walletAddress: string, nonce: string): Promise<NonceRecord | null> {
    const row = await db.select().from(authNonces)
      .where(and(eq(authNonces.walletAddress, walletAddress), eq(authNonces.nonce, nonce)))
      .get();

    const record = nonceToRecord(row);
    if (!isNonceValid({ now: new Date(), record })) {
      return null;
    }

    return record ?? null;
  }

  static async markNonceUsed(nonce: string): Promise<boolean> {
    const result = await db.update(authNonces)
      .set({ usedAt: new Date() })
      .where(and(eq(authNonces.nonce, nonce), isNull(authNonces.usedAt)))
      .run();

    return (result.rowsAffected ?? 0) > 0;
  }
}
