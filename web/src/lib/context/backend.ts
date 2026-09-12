import { BACKEND_TOOLS } from "@/lib/supervisor";
import { runMemoryTool } from "@/lib/live/tools";
import { handleClientDelegation } from "@/lib/live/delegation";
import { enqueueEnrichment } from "@/lib/enrichment/queue";
import { brief, listPeople, upsertPerson } from "@/lib/memory";
import type { DelegateRequest, DelegateResult } from "@/lib/live/types";
import type { Person, Signal } from "@/lib/types";
import { buildInstructions } from "./prompt";
import { detect } from "@/lib/memory/detect";

/**
 * Model-driven delegation backend (context system). Same contract as handleClientDelegation;
 * the delegate route picks it with BACKEND_LLM=1. Any failure or timeout → Lisa's regex path,
 * so the live loop never dies on the model.
 * ponytail: raw fetch to the Responses API, no SDK; tool loop capped at 4 rounds / ~8 s.
 */

const MODEL = process.env.BACKEND_MODEL ?? "gpt-5.4-mini";
const ROUND_MS = 8_000;
const MAX_ROUNDS = 4;

type OutputItem =
  | { type: "function_call"; call_id: string; name: string; arguments: string }
  | { type: "message"; content: { type: string; text?: string }[] }
  | { type: string };

type Answer = { card: string; say: string; person_id: string | null; org?: string };

export async function runBackend(req: DelegateRequest): Promise<DelegateResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return handleClientDelegation(req);
  try {
    return await withModel(req, key);
  } catch (error) {
    console.error("[backend] model path failed → regex fallback", error);
    return handleClientDelegation(req);
  }
}

async function withModel(req: DelegateRequest, key: string): Promise<DelegateResult> {
  const trace: string[] = [];
  const signals = detect(req.transcripts.filter((t) => t.role === "user").slice(-3).map((t) => t.text).join(" "));
  let person: Person | null = null;
  let previous: string | undefined;
  let input: unknown[] = [
    {
      role: "user",
      content: `delegation_id: ${req.delegation_id}\n\nTranscript (latest last):\n${req.transcripts
        .map((t) => `${t.role}: ${t.text}`)
        .join("\n")}`,
    },
  ];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(ROUND_MS),
      body: JSON.stringify({
        model: MODEL,
        instructions: await buildInstructions(person?.id ?? req.last_person_id, signals),
        input,
        previous_response_id: previous,
        tools: BACKEND_TOOLS,
        reasoning: { effort: "low" },
        text: {
          format: {
            type: "json_schema",
            name: "delegate_answer",
            strict: true,
            schema: {
              type: "object",
              properties: {
                card: { type: "string" },
                say: { type: "string" },
                person_id: { type: ["string", "null"] },
                org: { type: "string" },
              },
              required: ["card", "say", "person_id", "org"],
              additionalProperties: false,
            },
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`responses ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { id: string; output: OutputItem[]; output_text?: string };
    previous = data.id;

    const calls = data.output.filter((o): o is Extract<OutputItem, { type: "function_call" }> => o.type === "function_call");
    if (!calls.length) {
      const text = outputText(data);
      return finish(req, parseAnswer(text), person, trace, signals);
    }

    input = [];
    for (const call of calls) {
      const args = safeJson(call.arguments);
      const result = await runMemoryTool(call.name, args);
      trace.push(`${call.name}(${summarize(args)}) → ${summarize(result)}`);
      const p = asPerson(result);
      if (p) person = p;
      input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result).slice(0, 4000) });
    }
  }
  throw new Error("tool loop exceeded MAX_ROUNDS");
}

async function finish(
  req: DelegateRequest,
  answer: Answer,
  person: Person | null,
  trace: string[],
  signals: Signal[] = [],
): Promise<DelegateResult> {
  if (!person && answer.person_id) {
    person = (await listPeople()).find((p) => p.id === answer.person_id) ?? null;
  }
  // Safety net: a spoken name must always be banked. The model sometimes narrates the intro turn
  // without calling a tool; the detector is deterministic, so fall back to it rather than lose
  // the person. upsertPerson merges by name, so this can't create a duplicate.
  const heardName = signals.find((s) => s.kind === "name")?.value;
  if (!person && heardName) {
    person = await upsertPerson({
      display_name: heardName,
      enrolled: false,
      facts: [{ text: "Met via spoken-name capture (no camera lookup)", source: "live", ts: new Date().toISOString() }],
    });
    trace.push(`fallback upsert_person → ${person.id} (model banked nothing)`);
  }
  // Persist the employer the model heard, whatever phrasing it arrived in.
  if (person && answer.org && answer.org !== person.org) {
    person = await upsertPerson({ id: person.id, display_name: person.display_name, org: answer.org });
  }
  let card = answer.card.trim().slice(0, 220);
  if (person) {
    if (!card) card = await brief(person.id);
    enqueueEnrichment(person.id, person.display_name, "exa");
  } else if (!card) {
    card = "Listening. Say “nice to meet you, NAME.”";
  }
  return {
    delegation_id: req.delegation_id,
    thinking: [`backend: ${MODEL}`, ...trace, `card: ${card}`].join("\n").slice(0, 1800),
    commentary: (answer.say || card).slice(0, 600),
    card,
    person,
    miss: !person,
  };
}

function outputText(data: { output: OutputItem[]; output_text?: string }) {
  if (data.output_text) return data.output_text;
  for (const item of data.output) {
    if (item.type === "message") {
      const text = (item as Extract<OutputItem, { type: "message" }>).content.find((c) => c.text)?.text;
      if (text) return text;
    }
  }
  return "";
}

function parseAnswer(text: string): Answer {
  const j = safeJson(text) as Partial<Answer>;
  return { card: String(j.card ?? ""), say: String(j.say ?? ""), person_id: j.person_id ?? null, org: String(j.org ?? "") };
}

function asPerson(v: unknown): Person | null {
  const p = v as Partial<Person> | null;
  return p && typeof p.id === "string" && typeof p.display_name === "string" && Array.isArray(p.facts) ? (p as Person) : null;
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function summarize(v: unknown) {
  return JSON.stringify(v).slice(0, 160);
}
