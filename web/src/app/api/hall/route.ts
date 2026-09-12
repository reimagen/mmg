import { NextResponse } from "next/server";
import {
  getLastHallPacket,
  hallSend,
  hermesEnabled,
  ingestHallPacket,
} from "@/lib/hall/client";
import type { HallPacket } from "@/lib/types";

/** Status + last packet. Flip HERMES_ENABLED=1 when hall/:8768 is up. */
export async function GET() {
  return NextResponse.json({
    enabled: hermesEnabled(),
    last_packet: getLastHallPacket(),
  });
}

/**
 * POST { room, text } → hall send (test).
 * POST { state, say, did, need, next } → ingest a packet as if Hermes handed off.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as Partial<HallPacket> & {
    room?: string;
    text?: string;
  };

  if (body.say && body.state && body.did && body.need && body.next) {
    const packet = ingestHallPacket({
      room: body.room ?? "research",
      state: body.state,
      say: body.say,
      did: body.did,
      need: body.need,
      next: body.next,
      packet_id: body.packet_id,
    });
    return NextResponse.json({ ingested: true, packet });
  }

  if (!body.room || !body.text) {
    return NextResponse.json(
      { error: "send {room,text} or ingest {state,say,did,need,next}" },
      { status: 400 },
    );
  }

  const sent = await hallSend({ room: body.room, text: body.text });
  return NextResponse.json(
    { sent, enabled: hermesEnabled() },
    { status: sent ? 202 : 503 },
  );
}
