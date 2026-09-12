import { NextResponse } from "next/server";
import { upsertPerson } from "@/lib/memory";
import type { UpsertPersonInput } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as UpsertPersonInput;
  if (!body.display_name) {
    return NextResponse.json({ error: "display_name required" }, { status: 400 });
  }
  return NextResponse.json(upsertPerson(body));
}
