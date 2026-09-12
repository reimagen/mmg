// Probe every model pool with one tiny structured question. Run: npm run pool:check
import { readFileSync } from "node:fs";
import { join } from "node:path";
try {
  for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0 && !line.startsWith("#")) process.env[line.slice(0, eq).trim()] ??= line.slice(eq + 1).trim();
  }
} catch {}

const { askJson, poolStatus, available } = await import("../src/lib/context/pool.ts");
const status = poolStatus();
console.log(`order    ${status.order.join(" → ") || "(none configured)"}`);
console.log(`openai   ${status.openai ? "key present" : "NO KEY"}`);
console.log(`oxen     ${status.oxen ? `key present · ${status.oxen.model} @ ${status.oxen.base}` : "NO KEY (set OXEN_API_KEY in web/.env.local)"}`);
console.log();

const SCHEMA = {
  type: "object",
  properties: { answer: { type: "string" } },
  required: ["answer"],
  additionalProperties: false,
};
for (const pool of ["openai", "oxen"]) {
  if (!available(pool)) { console.log(`${pool.padEnd(8)} skipped — no key`); continue; }
  process.env.MODEL_POOL = pool === "oxen" ? "oxen" : "openai";
  const started = Date.now();
  const out = await askJson({ instructions: "Reply with the single word: wired", input: "Are you up?", schema: SCHEMA });
  const ms = Date.now() - started;
  // MODEL_POOL puts the requested pool first, so a different pool answering means the first failed.
  console.log(out && out.pool === pool ? `${pool.padEnd(8)} OK   ${ms} ms   “${out.value.answer}”` : `${pool.padEnd(8)} FAILED (see the warning above)`);
}
