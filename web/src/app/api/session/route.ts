import { NextResponse } from "next/server";
import { liveSessionConfig } from "@/lib/live/session";
import { hangupAllLive, openLiveIds, rememberLiveId } from "@/lib/live/registry";
import { patchHealth } from "@/lib/supervisor";

export async function GET() {
  return NextResponse.json({
    openai: Boolean(process.env.OPENAI_API_KEY),
    model: liveSessionConfig().model,
    delegation: liveSessionConfig().delegation,
    open: await openLiveIds(),
  });
}

export async function POST(request: Request) {
  const { sdp } = (await request.json()) as { sdp?: string };
  if (!sdp?.trim()) {
    return NextResponse.json({ error: "An SDP offer is required" }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "Set OPENAI_API_KEY in web/.env.local, then restart npm run dev",
        stub: true,
      },
      { status: 503 },
    );
  }

  await hangupAllLive();

  const response = await fetch("https://api.openai.com/v1/live/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: liveSessionConfig(),
      transport: { type: "webrtc", sdp },
    }),
  });

  if (!response.ok) {
    patchHealth({ realtime: "degraded", model_pool: "openrouter" });
    const detail = await openaiError(response);
    return NextResponse.json(
      { error: "Live session creation failed", status: response.status, detail },
      { status: 502 },
    );
  }

  const payload = (await response.json()) as { session?: { id?: string } };
  if (payload.session?.id) await rememberLiveId(payload.session.id);
  patchHealth({ realtime: "live", model_pool: "openai", input: "browser" });
  return NextResponse.json(payload, { status: 201 });
}

async function openaiError(response: Response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as {
      error?: { message?: string; code?: string } | string;
    };
    if (typeof json.error === "string") return json.error;
    return json.error?.message ?? text.slice(0, 400);
  } catch {
    return text.slice(0, 400);
  }
}
