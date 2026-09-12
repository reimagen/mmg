import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { handleClientDelegation } from "@/lib/live/delegation";
import { runBackend } from "@/lib/context/backend";
import type { DelegateRequest } from "@/lib/live/types";

const FRAMES_DIR = join(process.cwd(), "data", "frames");

/** Client seam: every client sends the latest frame of its live video source; keep it beside the id for the face/memory lane. */
function saveFrame(delegationId: string, dataUrl: string): string | undefined {
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:image/jpeg;base64,") || comma < 0) return undefined;
  mkdirSync(FRAMES_DIR, { recursive: true });
  const path = join(FRAMES_DIR, `${delegationId.replace(/[^a-zA-Z0-9_-]/g, "_")}.jpg`);
  writeFileSync(path, Buffer.from(dataUrl.slice(comma + 1), "base64"));
  return path;
}

export async function POST(request: Request) {
  const body = (await request.json()) as DelegateRequest;
  if (!body.delegation_id) {
    return NextResponse.json({ error: "delegation_id required" }, { status: 400 });
  }
  try {
    // BACKEND_LLM=1 → model-driven backend (context system); else Lisa's regex path.
    const handle = process.env.BACKEND_LLM === "1" ? runBackend : handleClientDelegation;
    const frame_ref = body.frame ? saveFrame(body.delegation_id, body.frame) : undefined;
    return NextResponse.json({ ...(await handle(body)), frame_ref });
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
