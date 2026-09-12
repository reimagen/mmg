export type FactSource = "live" | "enrollment" | "exa" | "treg" | "manual";

export type FirstMet = {
  event: string;
  ts: string;
};

export type Fact = {
  text: string;
  source: FactSource;
  ts: string;
  /** Where a researched fact came from. Set for source "exa" / "treg"; absent for heard facts. */
  url?: string;
};

export type Person = {
  id: string;
  display_name: string;
  aliases: string[];
  /** Enrollment id only — never a raw embedding of a stranger. */
  face_ref: string | null;
  enrolled: boolean;
  first_met: FirstMet;
  facts: Fact[];
  open_threads: string[];
  last_seen: string;
  /** Employer or project, as the model understood it from the conversation. Drives research. */
  org?: string;
};

export type Interaction = {
  id: string;
  ts: string;
  person_id: string;
  transcript_ref: string;
  extracted_facts: string[];
  follow_ups: string[];
};

/** What the detection layer noticed in a heard turn (web/src/lib/memory/detect.ts). */
export type SignalKind = "name" | "role" | "company" | "commitment" | "ask" | "contact" | "correction";

export type Signal = {
  kind: SignalKind;
  /** The extracted value: a name, a company, the commitment itself. */
  value: string;
  /** The span it came from, for showing the operator why. */
  text: string;
  confidence: number;
};

export type WhisperCard = {
  person: Person;
  brief: string;
};

export type RecallQuery = {
  face_ref?: string;
  name?: string;
};

export type UpsertPersonInput = {
  id?: string;
  display_name: string;
  org?: string;
  aliases?: string[];
  face_ref?: string | null;
  enrolled?: boolean;
  first_met?: FirstMet;
  facts?: Fact[];
  open_threads?: string[];
};

export type LogInteractionInput = {
  person_id: string;
  transcript_ref: string;
  extracted_facts?: string[];
  follow_ups?: string[];
};

export type EnrichmentJob = {
  id: string;
  person_id: string;
  query: string;
  status: "queued" | "running" | "done" | "skipped" | "failed";
  source: "exa" | "treg";
  result?: string;
};

export type HallPacket = {
  room: string;
  state: string;
  say: string;
  did: string;
  need: string;
  next: string;
  packet_id?: string;
};

export type LoopHealth = {
  realtime: "live" | "degraded" | "down";
  memory: "ok" | "down";
  enrichment: "idle" | "running" | "killed";
  input: "glasses" | "browser";
  glasses: boolean;
  model_pool: "openai" | "openrouter" | "oxen";
  hermes: "off" | "queued" | "down";
};

export const MEMORY_TOOLS = [
  "recall",
  "upsert_person",
  "log_interaction",
  "brief",
] as const;
