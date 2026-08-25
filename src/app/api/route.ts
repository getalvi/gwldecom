import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "bdshop-api", ts: Date.now() });
}