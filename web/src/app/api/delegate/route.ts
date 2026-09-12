import { NextResponse } from "next/server";
import { handleClientDelegation } from "@/lib/live/delegation";
import { runBackend } from "@/lib/context/backend";
import type { DelegateRequest } from "@/lib/live/types";

export async function POST(request: Request) {
  const body = (await request.json()) as DelegateRequest;
  if (!body.delegation_id) {
    return NextResponse.json({ error: "delegation_id required" }, { status: 400 });
  }
  try {
    // BACKEND_LLM=1 → model-driven backend (context system); else Lisa's regex path.
    const handle = process.env.BACKEND_LLM === "1" ? runBackend : handleClientDelegation;
    return NextResponse.json(await handle(body));
  } catch (error) {
    return NextResponse.json(
      {
        delegation_id: body.delegation_id,
        thinking: "Memory backend skipped; keep talking.",
        commentary: "",
        card: "Memory skipped",
        person: null,
        miss: true,
        error: error instanceof Error ? error.message : "delegate failed",
      },
      { status: 200 },
    );
  }
}
