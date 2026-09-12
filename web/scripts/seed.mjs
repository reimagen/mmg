// Load the real team into memory. Run: npm run seed   (--empty for a cold start)
//
// These are actual people at the table, with the roles they actually own — the source of truth is
// MMG.aDNA/who/team.md. Nothing here is invented; if you want a cold ledger for the demo (the
// projector line is "memory fills as the wearer meets people"), run `npm run seed -- --empty`.
import { join } from "node:path";

const db = process.env.MEMORY_DB_PATH ?? join(process.cwd(), "data", "memory.db");
const { upsertPerson, listPeople, wipe } = await import("../src/lib/memory/sqlite.ts");
wipe(); // rows, not the file — a running next dev keeps its handle

if (process.argv.includes("--empty")) {
  console.log(`memory cleared → ${db} (0 people; the roster is untouched)`);
} else {
  const ts = new Date().toISOString();
  const EVENT = "Agents, Everywhere — OpenAI Global Hackathon, The KINN, Venice";
  const met = { event: EVENT, ts };
  const team = [
    ["person_greg", "Greg Schoeninger", ["Greg"], "Oxen.ai", "Team lead; runs the Oxen.ai token pool for the build"],
    ["person_jake", "Jake Joyner", ["Jake", "jakejjoyner"], "AILedger", "Owns the persistent memory system — schema, API, recall and brief"],
    ["person_lisa", "Lisa Gu", ["Lisa", "reimagenai"], "reimagen.ai", "Owns the GPT Live session and the Exa enrichment queue"],
    ["person_luis", "Luis", ["Luimaee"], "reimagen.ai", "Owns the whisper-card UI, the demo and the submission"],
    ["person_saint", "Saint Louis", ["Saint", "Bootoshi"], "", "Owns the glasses layer — the MentraOS bridge and enrollment"],
    ["person_seth", "Seth Tamrowski", ["Seth", "sethtam"], "Oxen AI", "Convener; GTM at Oxen AI, floats between demo data, enrollment and testing"],
    ["person_teddy", "Teddy Thoren", ["Teddy"], "", "Floater; keeps the backup GPU rig"],
    ["person_eric", "Eric Lawrence", ["Eric"], "", "Floater; testing"],
  ];
  for (const [id, name, aliases, org, role] of team) {
    upsertPerson({
      id,
      display_name: name,
      aliases,
      org: org || undefined,
      enrolled: false,
      face_ref: null,
      first_met: met,
      facts: [{ text: role, source: "enrollment", ts }],
      open_threads: [],
    });
  }
  console.log(`seeded ${listPeople().length} teammates → ${db}`);
}
