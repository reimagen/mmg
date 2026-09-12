import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { handleClientDelegation } from "@/lib/live/delegation";
import { runBackend } from "@/lib/context/backend";
import type { DelegateRequest } from "@/lib/live/types";
import { detect } from "@/lib/memory/detect";
import { recordTrace, traceOf } from "@/lib/context/runtime";
import { describeFrame } from "@/lib/live/vision";
import { enrollFace, faceRef, seenFaces } from "@/lib/live/faces";

const FRAMES_DIR = join(process.cwd(), "data", "frames");

function userText(body: DelegateRequest) {
  return body.transcripts.filter((t) => t.role === "user").slice(-3).map((t) => t.text).join(" ");
}

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
    // Detection is backend-independent: the operator sees what was heard even if memory misses.
    const heard = userText(body);
    const signals = detect(heard);
    const started = Date.now();
    // A recognized face in view resolves the person even when no name is spoken.
    if (!body.face_ref) {
      const known = (await seenFaces())?.find((f) => f.person_id);
      if (known?.person_id) body.face_ref = faceRef(known.person_id);
    }
    const [handled, sight] = await Promise.all([
      handle(body),
      body.frame ? describeFrame(body.frame, heard).catch((e: unknown) => { console.error("[vision]", e); return undefined; }) : undefined,
    ]);
    // Meet workflow: any introduction that produced a person links the largest face in view to them.
    if (handled.person && !handled.person.enrolled) void enrollFace(handled.person.id, handled.person.display_name);
    const result = {
      signals,
      ...handled,
      thinking: sight ? `${handled.thinking}\nSeen: ${sight}` : handled.thinking,
      frame_ref,
    };
    recordTrace(traceOf({ delegation_id: body.delegation_id, heard }, result, signals, Date.now() - started));
    return NextResponse.json(result);
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
