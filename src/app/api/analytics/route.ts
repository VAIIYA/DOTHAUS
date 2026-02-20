import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = typeof body?.event === "string" ? body.event : "unknown";
    const properties = body?.properties ?? {};

    console.log("[analytics]", event, properties);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
