import { LIVE_INSTRUCTIONS } from "@/lib/supervisor";

/**
 * GPT Live session — **client delegation**.
 * Docs: https://developers.openai.com/api/docs/guides/live-delegation?delegation-mode=client
 *
 * Live model does not run our tools. On `session.delegation.created` the
 * browser posts transcripts to POST /api/delegate; we run memory here, then
 * the browser appends `session.thinking` / `session.commentary` with that
 * `delegation.id`. Enrichment is queued separately and must not block.
 */

export function liveSessionConfig() {
  return {
    model: "gpt-live-1",
    instructions: LIVE_INSTRUCTIONS,
    audio: { output: { voice: "marin" } },
    delegation: { type: "client" as const },
  };
}
