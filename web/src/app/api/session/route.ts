import { NextResponse } from "next/server";
import { liveSessionConfig } from "@/lib/live/session";
import { patchHealth } from "@/lib/supervisor";

export async function POST(request: Request) {
  const { sdp } = (await request.json()) as { sdp?: string };
  if (!sdp?.trim()) {
    return NextResponse.json({ error: "An SDP offer is required" }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "Set OPENAI_API_KEY",
        stub: true,
        session: liveSessionConfig(),
      },
      { status: 503 },
    );
  }

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
    return NextResponse.json(
      { error: "Live session creation failed", status: response.status },
      { status: 502 },
    );
  }

  patchHealth({ realtime: "live", model_pool: "openai", input: "browser" });
  return NextResponse.json(await response.json(), { status: 201 });
}
