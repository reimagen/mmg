import { NextResponse } from "next/server";
import { getHealth, getMode } from "@/lib/supervisor";
import { listPeople } from "@/lib/memory";
import { openLiveIds } from "@/lib/live/registry";

export async function GET() {
  const live_open = (await openLiveIds()).length;
  return NextResponse.json({
    ok: true,
    team: "MMG",
    mode: getMode(),
    health: getHealth(),
    people: (await listPeople()).length,
    openai: Boolean(process.env.OPENAI_API_KEY),
    live_open,
  });
}
