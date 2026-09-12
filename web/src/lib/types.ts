export type CoachMode = "coach" | "roast";

export type FactSource = "live" | "enrollment" | "exa" | "treg" | "manual";

export type FirstMet = {
  event: string;
  ts: string;
};

export type Fact = {
  text: string;
  source: FactSource;
  ts: string;
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
};

export type Interaction = {
  id: string;
  ts: string;
  person_id: string;
  transcript_ref: string;
  extracted_facts: string[];
  follow_ups: string[];
};

export type WhisperCard = {
  person: Person;
  brief: string;
  mode: CoachMode;
};

export type RecallQuery = {
  face_ref?: string;
  name?: string;
};

export type UpsertPersonInput = {
  id?: string;
  display_name: string;
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

export type LoopHealth = {
  realtime: "live" | "degraded" | "down";
  memory: "ok" | "down";
  enrichment: "idle" | "running" | "killed";
  input: "glasses" | "browser";
  glasses: boolean;
  model_pool: "openai" | "openrouter" | "oxen";
};

export const MEMORY_TOOLS = [
  "recall",
  "upsert_person",
  "log_interaction",
  "brief",
] as const;
