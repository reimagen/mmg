/**
 * Model pool — OpenAI first, Oxen.ai as the second pool (Greg's token pool for this build).
 *
 * Oxen speaks OpenAI **chat-completions** at `https://hub.oxen.ai/api/ai`, so anything that is a
 * single-shot "read this, return JSON" call can run on either. That is where the bulk tokens go:
 * roster extraction reads thousands of characters per person. Keeping that off the OpenAI key
 * leaves the quota for the thing only OpenAI can do — the live voice session.
 *
 * `MODEL_POOL` picks the primary: `openai` (default), `oxen`, or `auto` (Oxen first, OpenAI on
 * failure — use it when the OpenAI quota is the thing you are protecting).
 * The keeper's tool loop stays on OpenAI Responses; its fallback is the regex path, not this.
 */

export type PoolName = "openai" | "oxen";

const OXEN_BASE = process.env.OXEN_BASE_URL ?? "https://hub.oxen.ai/api/ai";
const OXEN_MODEL = process.env.OXEN_MODEL ?? "deepseek-v4-flash";
const TIMEOUT_MS = 90_000;

export function poolOrder(): PoolName[] {
  const configured = (process.env.MODEL_POOL ?? "openai").toLowerCase();
  const order: PoolName[] = configured === "oxen" || configured === "auto" ? ["oxen", "openai"] : ["openai", "oxen"];
  return order.filter(available);
}

export function available(pool: PoolName) {
  return pool === "openai" ? Boolean(process.env.OPENAI_API_KEY) : Boolean(process.env.OXEN_API_KEY);
}

export function poolStatus() {
  return {
    order: poolOrder(),
    openai: available("openai"),
    oxen: available("oxen") ? { base: OXEN_BASE, model: OXEN_MODEL } : false,
  };
}

type Ask = {
  instructions: string;
  input: string;
  /** JSON Schema for the answer. Both pools are asked for strict JSON. */
  schema: Record<string, unknown>;
  schemaName?: string;
};

/**
 * One structured question, answered by whichever pool is up. Returns null only when every pool
 * failed — callers treat that as "skip", never as an error worth killing a conversation over.
 */
export async function askJson<T>(ask: Ask): Promise<{ value: T; pool: PoolName } | null> {
  const pools = poolOrder();
  if (!pools.length) {
    console.error("[pool] no model pool configured — set OPENAI_API_KEY or OXEN_API_KEY");
    return null;
  }
  for (const pool of pools) {
    try {
      const text = pool === "openai" ? await viaOpenAI(ask) : await viaOxen(ask);
      const value = JSON.parse(stripFence(text)) as T;
      await notePool(pool);
      return { value, pool };
    } catch (error) {
      console.warn(`[pool] ${pool} failed: ${error instanceof Error ? error.message : error}`);
    }
  }
  return null;
}

async function viaOpenAI({ instructions, input, schema, schemaName = "out" }: Ask) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: process.env.BACKEND_MODEL ?? "gpt-5.4-mini",
      reasoning: { effort: "low" },
      instructions,
      input,
      text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = (await res.json()) as {
    output_text?: string;
    output?: { type: string; content?: { text?: string }[] }[];
  };
  return (
    data.output_text ??
    data.output?.find((o) => o.type === "message")?.content?.find((c) => c.text)?.text ??
    "{}"
  );
}

async function viaOxen({ instructions, input, schema }: Ask) {
  const res = await fetch(`${OXEN_BASE}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OXEN_API_KEY}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      model: OXEN_MODEL,
      // Not every model on the pool honours response_format, so the schema is also in the prompt.
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${instructions}\n\nReply with JSON only, matching this schema exactly. No prose, no code fence.\n${JSON.stringify(schema)}`,
        },
        { role: "user", content: input },
      ],
    }),
  });
  if (!res.ok) throw new Error(`oxen ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("oxen returned no content");
  return text;
}

/** Health is a Next-side concern; scripts import this file without a server, so keep it optional. */
async function notePool(pool: PoolName) {
  try {
    const { patchHealth } = await import("../supervisor");
    patchHealth({ model_pool: pool });
  } catch {
    // running outside the app (a script) — nothing to report health to
  }
}

/** Models that ignore response_format still tend to fence their JSON. */
function stripFence(text: string) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fence?.[1] ?? text).trim();
}
