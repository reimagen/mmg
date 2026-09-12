import { NextResponse } from "next/server";
import { logInteraction, recall, upsertPerson } from "@/lib/memory";
import { noteGlassesSeen } from "@/lib/supervisor";
import { enqueueEnrichment } from "@/lib/enrichment/queue";

/**
 * MentraOS miniapp posts transcripts here.
 * Name-spoken fallback: "nice to meet you, NAME" → enroll (no camera lookup).
 */
const INTRO = /nice to meet you[, ]+([A-Z][a-zA-Z]+)/i;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    text?: string;
    isFinal?: boolean;
    face_ref?: string;
  };
  if (!body.text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  noteGlassesSeen();

  if (!body.isFinal) {
    return NextResponse.json({ ok: true, interim: true });
  }

  const intro = body.text.match(INTRO);
  if (intro?.[1]) {
    const person = await upsertPerson({
      display_name: intro[1],
      enrolled: false,
      facts: [
        {
          text: "Met via spoken-name capture (no camera lookup)",
          source: "live",
          ts: new Date().toISOString(),
        },
      ],
    });
    enqueueEnrichment(person.id, person.display_name, "exa");
    return NextResponse.json({ enrolled: person, via: "spoken-name" });
  }

  const person = await recall({ face_ref: body.face_ref, name: guessName(body.text) });
  if (!person) {
    return NextResponse.json({ miss: true, text: body.text });
  }

  await logInteraction({
    person_id: person.id,
    transcript_ref: `glasses:${Date.now()}`,
    extracted_facts: [body.text.slice(0, 180)],
  });

  return NextResponse.json({ person_id: person.id, text: body.text });
}

function guessName(text: string) {
  const match = text.match(/\b([A-Z][a-z]{2,})\b/);
  return match?.[1];
}
