import { listPeople } from "@/lib/memory";
import { detect } from "@/lib/memory/detect";
import { listRoster } from "@/lib/memory/roster";

/**
 * Context bias — the Wispr Flow paradigm. A recognizer with no prior hears "Sam at OpenAI" as
 * "Stan"; one that knows the names in the room does not. GPT Live gives us no place to put this
 * (its session rejects `audio.input` outright), so the list goes to the keeper model instead as a
 * correction pass over the transcript. It is also ready for a real biased ASR pass — see HANDOFF.
 */

const EVENT_TERMS = [
  "MMG", "Mac", "aDNA", "ailedger", "OpenAI", "Anthropic", "Exa", "MentraOS", "Oxen",
  "The KINN", "hackathon",
];

/** The names and terms this room already knows — used to un-mishear the transcript. */
export async function knownVocabulary(): Promise<string[]> {
  let names: string[] = [];
  let orgs: string[] = [];
  try {
    const people = await listPeople();
    names = people.flatMap((p) => [p.display_name, ...p.aliases]);
    orgs = people.flatMap((p) =>
      detect(p.facts.map((f) => f.text).join(". "))
        .filter((s) => s.kind === "company")
        .map((s) => s.value),
    );
  } catch {
    // A recognizer hint is never worth failing a session over.
  }
  // The pre-flight roster is the point: these are names that will actually be said in this room.
  const roster = listRoster();
  return [
    ...new Set([...roster.map((e) => e.name), ...roster.map((e) => e.org ?? ""), ...names, ...orgs, ...EVENT_TERMS]),
  ]
    .filter(Boolean)
    .slice(0, 120);
}
