import { brief, logInteraction, recall, upsertPerson } from "@/lib/memory";

/** Shared by client-delegation backend and any future Responses sidecar. */
export async function runMemoryTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "recall": {
      const person = await recall({
        face_ref: str(args.face_ref),
        name: str(args.name),
      });
      return person ?? { miss: true, hint: "audio-name capture, no camera lookup" };
    }
    case "upsert_person": {
      const facts = asStringArray(args.facts).map((text) => ({
        text,
        source: "live" as const,
        ts: new Date().toISOString(),
      }));
      return upsertPerson({
        display_name: String(args.display_name),
        aliases: asStringArray(args.aliases),
        face_ref: str(args.face_ref) ?? null,
        enrolled: Boolean(args.enrolled),
        facts,
        open_threads: asStringArray(args.open_threads),
      });
    }
    case "log_interaction":
      return logInteraction({
        person_id: String(args.person_id),
        transcript_ref: String(args.transcript_ref),
        extracted_facts: asStringArray(args.extracted_facts),
        follow_ups: asStringArray(args.follow_ups),
      });
    case "brief":
      return { brief: await brief(String(args.person_id)) };
    default:
      return { error: `unknown tool ${name}` };
  }
}

function str(value: unknown) {
  return typeof value === "string" && value.length ? value : undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}
