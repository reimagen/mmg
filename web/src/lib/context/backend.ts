import { BACKEND_TOOLS } from "@/lib/supervisor";
import { runMemoryTool } from "@/lib/live/tools";
import { enqueueEnrichment } from "@/lib/enrichment/queue";
import { brief, listPeople, upsertPerson } from "@/lib/memory";
import type { DelegateRequest, DelegateResult } from "@/lib/live/types";
import type { Person, Signal } from "@/lib/types";
import { buildInstructions } from "./prompt";
import { detect } from "@/lib/memory/detect";

/**
 * Model-driven delegation backend (context system). Same contract as handleClientDelegation;
 * the delegate route picks it with BACKEND_LLM=1. Real function calling: the model banks people
 * through upsert_person / log_interaction, never a regex. A failure is reported as a failure.
 * ponytail: raw fetch to the Responses API, no SDK.
 */

const MODEL = process.env.BACKEND_MODEL ?? "gpt-5.6-luna";
const WEARER = process.env.WEARER_NAME ?? "Saint Louis";
const ROUND_MS = 20_000;
const TOTAL_MS = 60_000;

type OutputItem =
  | { type: "function_call"; call_id: string; name: string; arguments: string }
  | { type: "message"; content: { type: string; text?: string }[] }
  | { type: string };

type Answer = { card: string; say: string; person_id: string | null; org?: string };

export async function runBackend(req: DelegateRequest): Promise<DelegateResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing: the model backend cannot run");
  try {
    return await withModel(req, key);
  } catch (error) {
    // A backend failure is reported as a failure, never dressed up as a regex-made card:
    // that path is what banked "How" and "I'm" during the live run.
    console.error("[backend] model path failed", error);
    return {
      delegation_id: req.delegation_id,
      thinking: `backend: ${MODEL} failed: ${String(error).slice(0, 200)}`,
      commentary: "",
      card: "Memory backend hiccup - still listening.",
      person: null,
      miss: true,
    };
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
      content: `delegation_id: ${req.delegation_id}\nThe wearer of the glasses (the operator, "Mac's" human) is ${WEARER}. He is not a new person; never bank him.\n\nTranscript (latest last):\n${req.transcripts
        .map((t) => `${t.role}: ${t.text}`)
        .join("\n")}`,
    },
  ];

  // No round cap: the model calls tools until it has an answer. One total deadline is the only stop,
  // so a stuck loop surfaces as a reported failure, not a fake card.
  const deadline = Date.now() + TOTAL_MS;
  while (Date.now() < deadline) {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(Math.min(ROUND_MS, Math.max(1, deadline - Date.now()))),
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
  throw new Error(`backend exceeded ${TOTAL_MS / 1000}s total`);
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
  // No regex safety net: banking is the model's call through upsert_person. The detector's
  // guesses ("I'm Saint", "How") are exactly the garbage a function call exists to prevent.
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
