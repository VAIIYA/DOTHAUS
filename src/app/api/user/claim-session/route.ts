import { NextRequest, NextResponse } from "next/server";
import { UserService } from "@/lib/services/user-service";

function toSafeNumber(value: unknown, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.min(parsed, max);
}

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, wins, losses, totalEarnings } = await req.json();
    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    const normalizedWins = Math.floor(toSafeNumber(wins, 200));
    const normalizedLosses = Math.floor(toSafeNumber(losses, 200));
    const normalizedEarnings = toSafeNumber(totalEarnings, 100000);

    if (normalizedWins === 0 && normalizedLosses === 0 && normalizedEarnings === 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await UserService.updateUserStats(walletAddress, {
      wins: normalizedWins,
      losses: normalizedLosses,
      totalEarnings: normalizedEarnings,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("claim-session failed", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
