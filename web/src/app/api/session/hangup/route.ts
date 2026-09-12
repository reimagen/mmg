import { NextResponse } from "next/server";
import { hangupAllLive, openLiveIds } from "@/lib/live/registry";
import { patchHealth } from "@/lib/supervisor";

export async function POST() {
  const results = await hangupAllLive();
  patchHealth({ realtime: "down" });
  return NextResponse.json({ ok: true, hung_up: results });
}

export async function GET() {
  return NextResponse.json({ open: await openLiveIds() });
}
