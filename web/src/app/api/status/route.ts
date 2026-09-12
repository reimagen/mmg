import { NextResponse } from "next/server";
import { getHealth } from "@/lib/supervisor";
import { listPeople } from "@/lib/memory";

export async function GET() {
  return NextResponse.json({
    ok: true,
    team: "MMG",
    health: getHealth(),
    people: (await listPeople()).length,
  });
}
