import { NextResponse } from "next/server";
import { listRoster, saveRoster, type RosterEntry } from "@/lib/memory/roster";

/**
 * Ingest a roster from a page only a signed-in human can see — the hackathon's team list, a Luma
 * guest list, a Discord member export. The open web does not have the attendees of a same-day
 * event; the event's own site does. Paste-in beats guessing.
 *
 * POST { source, teams: [{ team, description }] }  ← team blurbs naming their members
 * POST { source, people: [{ name, org, blurb }] }  ← already-structured names
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    source?: string;
    teams?: { team: string; description: string }[];
    people?: { name: string; org?: string; blurb?: string }[];
  };
  const ts = new Date().toISOString();
  const found_by = `imported: ${body.source ?? "paste"}`;

  if (body.people?.length) {
    const entries: RosterEntry[] = body.people
      .filter((p) => p.name?.trim())
      .map((p) => ({ name: p.name.trim(), org: p.org, blurb: p.blurb, url: body.source, found_by, ts }));
    saveRoster(entries);
    return NextResponse.json({ added: entries.length, roster: listRoster().length });
  }

  if (!body.teams?.length) {
    return NextResponse.json({ error: "teams or people required" }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY required to read team blurbs" }, { status: 503 });
  }

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model: process.env.BACKEND_MODEL ?? "gpt-5.4-mini",
      reasoning: { effort: "low" },
      instructions:
        "These are team blurbs from a hackathon's team list. Pull out every named person. For each: " +
        "their name exactly as written, their company or school if the blurb gives one, their team " +
        "name, and one short factual line from the blurb about what they do (<= 140 chars). Only " +
        "people actually named. Never invent a person, a company, or a detail.",
      input: body.teams.map((t) => `## ${t.team}\n${t.description}`).join("\n\n"),
      text: {
        format: {
          type: "json_schema",
          name: "roster_import",
          strict: true,
          schema: {
            type: "object",
            properties: {
              people: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    org: { type: "string" },
                    team: { type: "string" },
                    blurb: { type: "string" },
                  },
                  required: ["name", "org", "team", "blurb"],
                  additionalProperties: false,
                },
              },
            },
            required: ["people"],
            additionalProperties: false,
          },
        },
      },
    }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: `model ${res.status}`, detail: (await res.text()).slice(0, 300) }, { status: 502 });
  }
  const data = (await res.json()) as { output_text?: string; output?: { type: string; content?: { text?: string }[] }[] };
  const text =
    data.output_text ??
    data.output?.find((o) => o.type === "message")?.content?.find((c) => c.text)?.text ??
    "{}";
  let people: { name: string; org?: string; team?: string; blurb?: string }[] = [];
  try {
    people = JSON.parse(text).people ?? [];
  } catch {
    return NextResponse.json({ error: "could not parse extraction" }, { status: 502 });
  }

  const entries: RosterEntry[] = people
    .filter((p) => p.name?.trim())
    .map((p) => ({
      name: p.name.trim(),
      org: p.org || undefined,
      role: p.team ? `team ${p.team}` : undefined,
      blurb: p.blurb || undefined,
      url: body.source,
      found_by,
      ts,
    }));
  saveRoster(entries);
  return NextResponse.json({ added: entries.length, roster: listRoster().length, names: entries.map((e) => e.name) });
}
