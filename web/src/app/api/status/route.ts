import { NextResponse } from "next/server";
import { getHealth, getMode } from "@/lib/supervisor";
import { listPeople } from "@/lib/memory";

export async function GET() {
  return NextResponse.json({
    ok: true,
    team: "MMG",
    mode: getMode(),
    health: getHealth(),
    people: (await listPeople()).length,
  });
}
