import { NextResponse } from "next/server";
import { logInteraction } from "@/lib/memory";
import type { LogInteractionInput } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as LogInteractionInput;
  if (!body.person_id || !body.transcript_ref) {
    return NextResponse.json(
      { error: "person_id and transcript_ref required" },
      { status: 400 },
    );
  }
  return NextResponse.json(logInteraction(body));
}
