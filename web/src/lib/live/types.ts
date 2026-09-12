import type { Person } from "../types";

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
  /** Where the delegation frame was saved (web/data/frames/<delegation_id>.jpg), when one was sent. */
  frame_ref?: string;
};
