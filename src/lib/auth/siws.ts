const NONCE_TTL_MS = 5 * 60 * 1000;

interface AuthMessageParams {
  domain: string;
  walletAddress: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
}

export interface NonceRecord {
  nonce: string;
  walletAddress: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface NonceValidationInput {
  now: Date;
  record?: NonceRecord;
}

export function buildAuthMessage(params: AuthMessageParams): string {
  return [
    "DOTHAUS wallet sign-in",
    `Domain: ${params.domain}`,
    `Wallet: ${params.walletAddress}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${params.issuedAt}`,
    `Expires At: ${params.expiresAt}`,
  ].join("\n");
}

export function getNonceTtlMs(): number {
  return NONCE_TTL_MS;
}

export function createNonceExpiry(now: Date): Date {
  return new Date(now.getTime() + NONCE_TTL_MS);
}

export function isNonceValid({ now, record }: NonceValidationInput): boolean {
  if (!record) return false;
  if (record.usedAt) return false;
  return record.expiresAt.getTime() > now.getTime();
}
