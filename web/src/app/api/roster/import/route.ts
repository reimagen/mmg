import { NextResponse } from "next/server";
import { listRoster, saveRoster, type RosterEntry } from "@/lib/memory/roster";
import { askJson, poolOrder } from "@/lib/context/pool";

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
  if (!poolOrder().length) {
    return NextResponse.json({ error: "set OPENAI_API_KEY or OXEN_API_KEY to read team blurbs" }, { status: 503 });
  }

  const answer = await askJson<{ people: { name: string; org?: string; team?: string; blurb?: string }[] }>({
    instructions:
      "These are team blurbs from a hackathon's team list. Pull out every named person. For each: " +
      "their name exactly as written, their company or school if the blurb gives one, their team " +
      "name, and one short factual line from the blurb about what they do (<= 140 chars). Only " +
      "people actually named. Never invent a person, a company, or a detail.",
    input: body.teams.map((t) => `## ${t.team}\n${t.description}`).join("\n\n"),
    schemaName: "roster_import",
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
  });
  if (!answer) {
    return NextResponse.json({ error: "no model pool answered", pools: poolOrder() }, { status: 502 });
  }
  const people = answer.value.people ?? [];

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
  return NextResponse.json({
    added: entries.length,
    roster: listRoster().length,
    pool: answer.pool,
    names: entries.map((e) => e.name),
  });
}
