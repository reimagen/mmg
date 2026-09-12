import type { DelegateResult } from "@/lib/live/types";
import type { Signal } from "@/lib/types";

/**
 * Runtime trace — what the backend just did, so the operator (and the judges) can watch it.
 * The whole point: the memory system is not a black box behind a card.
 * ponytail: in-memory ring of 12, on globalThis for HMR. Nothing durable — the wiki is the record.
 */

export type Trace = {
  delegation_id: string;
  ts: string;
  heard: string;
  signals: Signal[];
  /** Tool calls the backend made this turn, in order ("upsert_person → person_ab12"). */
  tools: string[];
  card: string;
  person_id: string | null;
  ms: number;
  backend: "model" | "regex";
};

const RING = 12;

function ring(): Trace[] {
  const g = globalThis as { __mmgTraces?: Trace[] };
  g.__mmgTraces ??= [];
  return g.__mmgTraces;
}

export function recordTrace(t: Trace) {
  const traces = ring();
  traces.unshift(t);
  traces.length = Math.min(traces.length, RING);
}

export function listTraces(): Trace[] {
  return ring();
}

export function backendName(): "model" | "regex" {
  return process.env.BACKEND_LLM === "1" ? "model" : "regex";
}

/** Tool names pulled off the model backend's thinking block, which already logs them in order. */
export function toolsFromThinking(thinking: string): string[] {
  return thinking
    .split("\n")
    .filter((line) => /^\w+\(.*\) →/.test(line))
    .map((line) => {
      const name = line.slice(0, line.indexOf("("));
      const id = line.match(/person_[a-z0-9]{6,}|ix_[a-z0-9]{6,}/)?.[0];
      return id ? `${name} → ${id}` : name;
    });
}

export function traceOf(
  req: { delegation_id: string; heard: string },
  result: DelegateResult,
  signals: Signal[],
  ms: number,
): Trace {
  return {
    delegation_id: req.delegation_id,
    ts: new Date().toISOString(),
    heard: req.heard.slice(-200),
    signals,
    tools: toolsFromThinking(result.thinking ?? ""),
    card: result.card,
    person_id: result.person?.id ?? null,
    ms,
    backend: backendName(),
  };
}
