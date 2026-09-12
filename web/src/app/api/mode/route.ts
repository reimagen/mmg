import { NextResponse } from "next/server";
import { getHealth, getMode, setMode } from "@/lib/supervisor";
import type { CoachMode } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ mode: getMode(), health: getHealth() });
}

export async function POST(request: Request) {
  const { mode } = (await request.json()) as { mode?: CoachMode };
  if (mode !== "coach" && mode !== "roast") {
    return NextResponse.json({ error: "mode must be coach | roast" }, { status: 400 });
  }
  return NextResponse.json({ mode: setMode(mode), health: getHealth() });
}
