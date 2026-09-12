import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Interaction, Person } from "../types";

/**
 * LLM-Wiki projection (aDNA form). SQLite is the store; this is the human/agent-readable
 * mirror: one page per person under who/people/, an index, and the keeper's CLAUDE.md.
 * The backend model's context packet IS the person's page (see context/prompt.ts).
 * ponytail: write-through on every save, whole page each time — tens of people, not thousands.
 */

export const WIKI_DIR = process.env.MEMORY_WIKI_DIR ?? join(process.cwd(), "data", "wiki");
const PEOPLE = join(WIKI_DIR, "who", "people");

const KEEPER_CLAUDE_MD = `# CLAUDE.md — Mac's memory (who/)

This vault is the people-memory of **Mac**, the MMG social copilot. It follows the aDNA triad:
\`who/people/<name>.md\` is one page per person the operator has met. An agent (the delegation
backend) reads the page before speaking and rewrites it after every turn — the LLM-Wiki loop:
**recall → bank → brief**, page in, page out.

Rules: never invent a person or a fact · spoken-name capture is the only enroll path (no camera
lookup of strangers) · facts carry \`source\` + \`ts\` · transcripts are never stored, only refs ·
the whisper card is ≤ 2 sentences and is verbatim ground truth for the UI.
`;

const slug = (p: Person) =>
  p.display_name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || p.id;

export function renderPersonPage(p: Person, interactions: Interaction[] = []): string {
  const day = (iso: string) => iso.slice(0, 10);
  const facts = p.facts.length
    ? p.facts.map((f) => `- ${f.text} _(${f.source}, ${day(f.ts)})_`).join("\n")
    : "- _none yet_";
  const threads = p.open_threads.length ? p.open_threads.map((t) => `- [ ] ${t}`).join("\n") : "- _none_";
  const log = interactions.length
    ? interactions.map((i) => `- ${i.ts.slice(0, 16).replace("T", " ")} · \`${i.transcript_ref}\` · ${i.extracted_facts.length} facts, ${i.follow_ups.length} follow-ups`).join("\n")
    : "- _none_";
  return `---
type: person
status: active
created: ${day(p.first_met.ts)}
updated: ${day(p.last_seen)}
last_edited_by: mac
tags: [person, ${p.enrolled ? "enrolled" : "spoken-name"}]
id: ${p.id}
aliases: [${p.aliases.join(", ")}]
face_ref: ${p.face_ref ?? "null"}
---

# ${p.display_name}

First met: ${p.first_met.event} (${day(p.first_met.ts)}) · Last seen: ${p.last_seen}

## Facts
${facts}

## Open threads
${threads}

## Interactions (refs only — transcripts are never stored)
${log}
`;
}

export function writePersonPage(p: Person, interactions: Interaction[] = []) {
  mkdirSync(PEOPLE, { recursive: true });
  const claude = join(WIKI_DIR, "CLAUDE.md");
  if (!existsSync(claude)) writeFileSync(claude, KEEPER_CLAUDE_MD);
  writeFileSync(join(PEOPLE, `${slug(p)}.md`), renderPersonPage(p, interactions));
}

export function writeIndex(people: Person[]) {
  mkdirSync(PEOPLE, { recursive: true });
  const rows = people.map((p) => `| [[${slug(p)}]] | ${p.display_name} | ${p.facts.length} | ${p.open_threads[0] ?? ""} | ${p.last_seen.slice(0, 16).replace("T", " ")} |`);
  writeFileSync(
    join(PEOPLE, "index.md"),
    `---\ntype: index\nstatus: active\ncreated: 2026-09-12\nupdated: ${new Date().toISOString().slice(0, 10)}\nlast_edited_by: mac\ntags: [index, people]\n---\n\n# People — ${people.length}\n\n| page | name | facts | open thread | last seen |\n|---|---|---:|---|---|\n${rows.join("\n")}\n`,
  );
}
