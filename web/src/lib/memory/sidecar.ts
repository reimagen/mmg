/**
 * Memory client — Jake FastAPI :7777, JSON store fallback if sidecar is down.
 * Reads timeout fast so Live never hangs on a dead port.
 */

import { patchHealth } from "../supervisor";
import type {
  Interaction,
  LogInteractionInput,
  Person,
  RecallQuery,
  UpsertPersonInput,
} from "../types";
import * as local from "./store";

const READ_MS = 400;
const WRITE_MS = 800;

function baseUrl() {
  return (process.env.MEMORY_API_URL ?? "http://127.0.0.1:7777").replace(/\/$/, "");
}

async function memFetch(path: string, init: RequestInit, ms: number) {
  try {
    const response = await fetch(baseUrl() + path, {
      ...init,
      signal: AbortSignal.timeout(ms),
    });
    if (!response.ok) return null;
    patchHealth({ memory: "ok" });
    return response;
  } catch {
    patchHealth({ memory: "down" });
    return null;
  }
}

export async function recall(query: RecallQuery): Promise<Person | null> {
  const params = new URLSearchParams();
  if (query.face_ref) params.set("face_ref", query.face_ref);
  if (query.name) params.set("name", query.name);
  const response = await memFetch(`/recall?${params}`, { method: "GET" }, READ_MS);
  if (!response) return local.recall(query);
  const data = (await response.json()) as { unknown?: boolean } & Partial<Person> & {
    person_id?: string;
  };
  if (data.unknown) return null;
  return asPerson(data) ?? local.recall(query);
}

export async function upsertPerson(input: UpsertPersonInput): Promise<Person> {
  const response = await memFetch(
    "/upsert_person",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: input.display_name,
        face_ref: input.face_ref ?? undefined,
        event: input.first_met?.event ?? "spoken-name",
        fact: input.facts?.[0]?.text,
        open_thread: input.open_threads?.[0],
      }),
    },
    WRITE_MS,
  );
  if (!response) return local.upsertPerson(input);

  const extra = input.facts?.slice(1).map((f) => f.text) ?? [];
  const created = (await response.json()) as { person_id?: string };
  if (created.person_id && extra.length) {
    await logInteraction({
      person_id: created.person_id,
      transcript_ref: "live",
      extracted_facts: extra,
    });
  }
  const hit =
    (await recall({ name: input.display_name, face_ref: input.face_ref ?? undefined })) ??
    (await listPeople()).find((p) => p.id === created.person_id);
  if (hit) return hit;
  return local.upsertPerson({ ...input, id: created.person_id });
}

export async function logInteraction(input: LogInteractionInput): Promise<Interaction> {
  const response = await memFetch(
    "/log_interaction",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: input.person_id,
        transcript_ref: input.transcript_ref,
        extracted_facts: input.extracted_facts ?? [],
        follow_ups: input.follow_ups ?? [],
      }),
    },
    WRITE_MS,
  );
  if (!response) return local.logInteraction(input);
  return {
    id: `ix_${input.person_id}`,
    ts: new Date().toISOString(),
    person_id: input.person_id,
    transcript_ref: input.transcript_ref,
    extracted_facts: input.extracted_facts ?? [],
    follow_ups: input.follow_ups ?? [],
  };
}

export async function brief(personId: string): Promise<string> {
  const response = await memFetch(`/brief/${encodeURIComponent(personId)}`, { method: "GET" }, READ_MS);
  if (!response) return local.brief(personId);
  const data = (await response.json()) as { brief?: string; unknown?: boolean };
  if (data.unknown || !data.brief) return local.brief(personId);
  return data.brief;
}

export async function listPeople(): Promise<Person[]> {
  const response = await memFetch("/people", { method: "GET" }, READ_MS);
  if (!response) return local.listPeople();
  const data = (await response.json()) as { people?: Partial<Person>[] };
  return (data.people ?? []).map(asPerson).filter((p): p is Person => Boolean(p));
}

function asPerson(raw: Partial<Person> & { person_id?: string; id?: string }): Person | null {
  const id = raw.id ?? raw.person_id;
  const name = raw.display_name;
  if (!id || !name) return null;
  const now = new Date().toISOString();
  return {
    id,
    display_name: name,
    aliases: raw.aliases ?? [],
    face_ref: raw.face_ref ?? null,
    enrolled: raw.enrolled ?? Boolean(raw.face_ref),
    first_met: raw.first_met ?? { event: "hackathon floor", ts: now },
    facts: raw.facts ?? [],
    open_threads: raw.open_threads ?? [],
    last_seen: raw.last_seen ?? now,
  };
}
