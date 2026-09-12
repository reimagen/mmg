import { randomUUID } from "node:crypto";
import type { EnrichmentJob } from "../types";
import { hallSend, hallStop, hermesEnabled } from "../hall/client";
import { listPeople, upsertPerson } from "../memory";
import { researchPerson } from "../memory/enrich";
import { patchHealth } from "../supervisor";

/**
 * Enrichment loop — async, killable.
 * Queue in, queue out. A crash here must never take down GPT Live.
 *
 * Providers:
 *   Exa  — live search / page fetch  (REST, not MCP, in the app)
 *   treg — people + company enrichment  https://treg.to/llms.txt
 *
 * Every call: timeout + budget + fallback to cached/skip.
 */

const TIMEOUT_MS = 4_000;
const jobs = new Map<string, EnrichmentJob>();

export function enqueueEnrichment(
  personId: string,
  query: string,
  source: EnrichmentJob["source"] = "exa",
): EnrichmentJob {
  const job: EnrichmentJob = {
    id: `job_${randomUUID().slice(0, 8)}`,
    person_id: personId,
    query,
    status: "queued",
    source,
  };
  jobs.set(job.id, job);
  void dispatch(job);
  return job;
}

async function dispatch(job: EnrichmentJob) {
  if (hermesEnabled()) {
    const sent = await hallSend({
      room: "research",
      text: `Enrich person ${job.person_id}. Query: ${job.query}. Write notes to the memory API. Call emit_handoff when done.`,
    });
    if (sent) {
      job.result = "handed to hermes room:research";
      patchHealth({ enrichment: "running", hermes: "queued" });
      return;
    }
    patchHealth({ hermes: "down" });
  }
  await run(job);
}

export function listJobs() {
  return [...jobs.values()];
}

export function killEnrichment() {
  patchHealth({ enrichment: "killed" });
  void hallStop("research");
  for (const job of jobs.values()) {
    if (job.status === "queued" || job.status === "running") {
      job.status = "skipped";
      job.result = "killed by supervisor";
    }
  }
}

async function run(job: EnrichmentJob) {
  job.status = "running";
  patchHealth({ enrichment: "running" });
  try {
    // Jake's lane owns the research loop end to end (query from detected context → name gate →
    // structured facts with their source URL). See memory/HANDOFF.md.
    const person = (await listPeople()).find((p) => p.id === job.person_id);
    if (!person) {
      job.status = "skipped";
      job.result = "person vanished before research ran";
      return;
    }
    const research = await researchPerson(person, job.source);
    job.status = research.status;
    job.result = research.note;
    if (research.facts.length) {
      await upsertPerson({ id: person.id, display_name: person.display_name, facts: research.facts });
    }
  } catch (error) {
    job.status = "failed";
    job.result = error instanceof Error ? error.message : "enrichment failed";
  } finally {
    const running = [...jobs.values()].some((j) => j.status === "running");
    patchHealth({ enrichment: running ? "running" : "idle" });
  }
}

async function callExa(query: string): Promise<string | null> {
  const key = process.env.EXA_API_KEY;
  if (!key) return `exa stub: would search “${query}”`;

  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({ query, numResults: 3, contents: { text: true } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    results?: { title?: string; text?: string }[];
  };
  return data.results?.map((r) => r.title ?? r.text ?? "").join(" · ") ?? null;
}

async function callTreg(query: string): Promise<string | null> {
  const token = process.env.TREG_TOKEN;
  if (!token) return `treg stub: would enrich “${query}”`;

  // People enrichment catalog ids — pick on evidence at runtime.
  // See https://treg.to/llms.txt  POST https://treg.to/call/<id>
  const response = await fetch(
    `https://treg.to/call/lusha.person.enrich?q=${encodeURIComponent(query)}`,
    {
      headers: { "X-Treg-Token": token },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!response.ok) return null;
  return response.text();
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}
