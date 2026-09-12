// Wipe + load the demo cast. Run: npm run seed  (from web/)
import { join } from "node:path";

const db = process.env.MEMORY_DB_PATH ?? join(process.cwd(), "data", "memory.db");
const { upsertPerson, listPeople, wipe } = await import("../src/lib/memory/sqlite.ts");
wipe(); // rows, not the file — a running next dev keeps its handle
const ts = new Date().toISOString();
const EVENT = "OpenAI Global Hackathon @ The KINN";
const fact = (text, source = "enrollment") => ({ text, source, ts });
const met = { event: EVENT, ts };

// 1 enrolled (face_ref) + 4 spoken-name (face_ref null). Ada is NOT seeded — the exit gate banks her live.
const cast = [
  { id: "person_jake", display_name: "Jake", aliases: ["jacob"], face_ref: "enrolled:jake", enrolled: true, first_met: met,
    facts: [fact("Building the persistent memory system"), fact("Owns SQLite schema + recall API")], open_threads: ["Ask about the schema."] },
  { id: "person_luis", display_name: "Luis", first_met: met,
    facts: [fact("Owns whisper card + ledger UI + submission")], open_threads: ["Glasses streaming reliability — fall back early if flaky."] },
  { id: "person_lisa", display_name: "Lisa", first_met: met,
    facts: [fact("Owns GPT Live client delegation + Exa enrichment")], open_threads: ["callExa → raw results for the name gate."] },
  { id: "person_saint", display_name: "Saint", first_met: met,
    facts: [fact("Owns glasses lane (P2)")], open_threads: ["Glasses ingest is unchanged — POST /api/glasses/ingest."] },
  { id: "person_maya", display_name: "Maya Chen", first_met: met,
    facts: [fact("Judge track: agents everywhere; asked about privacy of face data")], open_threads: ["Show her the no-camera-lookup rule on the card."] },
];
for (const p of cast) upsertPerson({ enrolled: false, face_ref: null, ...p });
console.log(`seeded ${listPeople().length} people → ${db}`);
