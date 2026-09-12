import type { Person, Signal } from "../types";

export type TranscriptTurn = {
  role: "user" | "assistant";
  text: string;
};

export type DelegateRequest = {
  delegation_id: string;
  transcripts: TranscriptTurn[];
  last_person_id?: string;
  face_ref?: string;
  /** Client seam: JPEG data URL from the client's live video source at delegation time. */
  frame?: string;
};

export type DelegateResult = {
  delegation_id: string;
  thinking: string;
  commentary: string;
  card: string;
  person: Person | null;
  miss: boolean;
  /** What the detection layer heard this turn — shown in the runtime rail, always present. */
  signals?: Signal[];
  /** Where the delegation frame was saved (web/data/frames/<delegation_id>.jpg), when one was sent. */
  frame_ref?: string;
};
