// Export the roster out of the demo and into the lattice, where it outlives this hackathon.
// Run: npm run roster:export [-- /path/to/dir]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out =
  process.argv[2] ??
  "/home/jjoyner/aDNA/operations_jake.aDNA/what/context/people";
const { listRoster } = await import("../src/lib/memory/roster.ts");
const roster = [...listRoster()].sort((a, b) => a.name.localeCompare(b.name));
const day = new Date().toISOString().slice(0, 10);
const slug = `roster_${day}_openai_global_hackathon`;

mkdirSync(out, { recursive: true });
writeFileSync(join(out, `${slug}.json`), JSON.stringify({ event: "Agents, Everywhere — OpenAI Global Hackathon, The KINN, Venice", date: day, count: roster.length, people: roster }, null, 2));

const rows = roster.map((e) => `| ${e.name} | ${e.org ?? ""} | ${(e.blurb ?? "").replace(/\|/g, "/").slice(0, 110)} | ${e.found_by.startsWith("imported") ? "attendee list" : e.found_by.startsWith("seed") ? "researched" : e.found_by} |`);
writeFileSync(
  join(out, `${slug}.md`),
  `---
type: context
status: active
created: ${day}
updated: ${day}
last_edited_by: jake
tags: [people, roster, event, hackathon, openai]
---

# People — Agents, Everywhere (OpenAI Global Hackathon), ${day}

The room at The KINN, Venice. ${roster.length} people: the published attendee list, the team-formation
page, and per-person research on the ones we expected to work with.

Built by MMG's pre-flight so the wearable knew who it was meeting before it met them. Kept here
because the people outlast the demo — this is a contact graph, not build state.
Machine-readable: \`${slug}.json\`. Regenerate with \`npm run roster:export\` in \`MMG.aDNA/what/mmg/web\`.

| name | org | what they do | source |
|---|---|---|---|
${rows.join("\n")}
`,
);
console.log(`${roster.length} people → ${join(out, slug)}.{md,json}`);
