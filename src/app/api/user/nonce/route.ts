import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth-service";

function getRequestDomain(req: NextRequest): string {
  return req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
}

export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json();

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    const nonce = await AuthService.issueNonce({
      walletAddress,
      domain: getRequestDomain(req),
    });

    return NextResponse.json(nonce);
  } catch (error) {
    console.error("Error issuing nonce:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
