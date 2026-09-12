/** Client of the vision sidecar (vision/server.py): face boxes, recognition, and enrollment. */
import { upsertPerson } from "@/lib/memory";

const VISION_URL = process.env.VISION_URL ?? "http://127.0.0.1:8791";

export type SeenFace = { person_id: string | null; name: string | null; score: number; box: [number, number, number, number] };

/** Link the largest face currently in view to this person. The sidecar turns the box blue at once; memory marks them enrolled. */
export async function enrollFace(personId: string, name: string): Promise<void> {
  const res = await fetch(`${VISION_URL}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(2_000),
    body: JSON.stringify({ person_id: personId, name }),
  }).catch((e: unknown) => { console.error("[faces] enroll unreachable", e); return undefined; });
  if (!res) return;
  if (!res.ok) { console.error("[faces] enroll", res.status, await res.text()); return; }
  upsertPerson({ id: personId, display_name: name, face_ref: faceRef(personId), enrolled: true });
}

/** The value stored in person.face_ref; recall({ face_ref }) resolves it back to the person. */
export const faceRef = (personId: string) => `face:${personId}`;
/** Faces in the latest frame; recognized ones carry person_id. Undefined when the sidecar is down. */
export async function seenFaces(): Promise<SeenFace[] | undefined> {
  const res = await fetch(`${VISION_URL}/faces`, { signal: AbortSignal.timeout(500) }).catch(() => undefined);
  if (!res?.ok) return undefined;
  const json: unknown = await res.json();
  if (json && typeof json === "object" && "faces" in json && Array.isArray(json.faces)) return json.faces as SeenFace[];
  return undefined;
}
