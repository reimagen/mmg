// Self-check for @/lib/memory (sqlite) + enrich. Run: npm run memory:check
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "mmg-mem-"));
process.env.MEMORY_DB_PATH = join(dir, "memory.db");
process.env.MEMORY_WIKI_DIR = join(dir, "wiki");

const m = await import("../src/lib/memory/sqlite.ts");
const e = await import("../src/lib/memory/enrich.ts");

// F1 bank + idempotent merge
const ada = m.upsertPerson({ display_name: "Ada", enrolled: false, facts: [{ text: "Met via spoken-name capture (no camera lookup)", source: "live", ts: "2026-09-12T19:00:00.000Z" }] });
assert.equal(m.upsertPerson({ display_name: "ada " }).id, ada.id, "name_key merge → one row");
assert.equal(m.upsertPerson({ display_name: "Ada", aliases: ["ada l"] }).aliases[0], "ada l");
assert.equal(m.recall({ name: "Ada L" })?.id, ada.id, "alias recall");
assert.equal(m.recall({ name: "nobody" }), null);

// F2 absorb
const ix = m.logInteraction({ person_id: ada.id, transcript_ref: "live:t1", extracted_facts: ["nice to meet you, . I run growth at Oxen and we ship weekly", "Ada", "hi"], follow_ups: ["Ask about the weekly ship"] });
assert.equal(ix.extracted_facts.length, 3, "interaction keeps raw extracted list");
const ada2 = m.recall({ name: "Ada" });
assert.equal(ada2.facts.length, 2, "name-only and <12 char facts dropped");
assert.equal(ada2.facts[1].source, "live"); assert.ok(ada2.facts[1].ts.endsWith("Z"));

// F4 brief: newest live first, then second fact
const b = m.brief(ada.id);
assert.ok(b.startsWith("Ada — I run growth at Oxen and we ship weekly. Met via spoken-name capture"), b);
assert.ok(b.length <= 220);
assert.equal(m.brief("nope"), "Unknown. Capture the name out loud and enroll.");

// exa ranks below live even when newer
m.upsertPerson({ id: ada.id, display_name: "Ada", facts: [{ text: "Oxen raises seed — techcrunch.com/x", source: "exa", ts: "2099-01-01T00:00:00.000Z" }] });
assert.ok(m.brief(ada.id).startsWith("Ada — I run growth"), "live outranks exa");

// F5 order + enrolled face recall
m.upsertPerson({ id: "person_jake", display_name: "Jake", face_ref: "enrolled:jake", enrolled: true });
assert.equal(m.listPeople()[0].id, "person_jake", "newest last_seen first");
assert.equal(m.recall({ face_ref: "enrolled:jake" })?.id, "person_jake");

// persistence across reopen: nuke the cached handle and re-import via a fresh path query
delete globalThis.__mmgMemoryDb;
const m2 = await import("../src/lib/memory/sqlite.ts?reopen");
assert.equal(m2.listPeople().length, 2, "rows persist after reopen");

// F3 enrich
assert.equal(e.researchQuery({ ...ada, facts: [ada.facts[0]] }), "", "bare first name + boilerplate only → unqueryable");
assert.ok(e.researchQuery(ada2).startsWith('"Ada" I run growth'), e.researchQuery(ada2));
const facts = e.absorbResearch(ada2, [
  { title: "Bob Smith joins Acme", url: "https://x.com/a", text: "Bob Smith is new." },
  { title: "Ada on growth", url: "https://blog.oxen.ai/ada-growth/", highlights: ["Ada leads growth at Oxen. She ships weekly."] },
  { title: "Ada again", url: "https://blog.oxen.ai/ada-growth/", text: "Ada dup url" },
  { title: "Ada 2", url: "https://y.com/2", text: "Ada two" },
  { title: "Ada 3", url: "https://y.com/3", text: "Ada three" },
]);
assert.equal(facts.length, 2, "wrong person dropped, dup url dropped, capped at 2");
assert.equal(facts[0].text, "Ada on growth — Ada leads growth at Oxen. — blog.oxen.ai/ada-growth");
assert.equal(facts[0].source, "exa");

// LLM-Wiki projection
const { readFileSync, existsSync } = await import("node:fs");
const page = readFileSync(join(dir, "wiki", "who", "people", "ada.md"), "utf8");
assert.ok(page.startsWith("---\ntype: person\n"), "aDNA frontmatter");
assert.ok(page.includes("- I run growth at Oxen and we ship weekly _(live,"), "fact with source");
assert.ok(readFileSync(join(dir, "wiki", "who", "people", "index.md"), "utf8").includes("[[ada]]"), "index links page");
assert.ok(existsSync(join(dir, "wiki", "CLAUDE.md")), "keeper CLAUDE.md seeded");

rmSync(dir, { recursive: true });
console.log("memory:check OK");
