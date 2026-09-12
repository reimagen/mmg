import type { Signal, SignalKind } from "../types";

/**
 * Detection layer — pure heuristics over a heard turn. No I/O, no model.
 * Runs on EVERY delegation (both backends) so the UI can show what the system noticed,
 * and feeds processing: commitments → open_threads, company/role → a better research query.
 * ponytail: regex heuristics, not an NER model. The LLM backend refines; this is the floor
 * and the always-on path when the model is off or slow.
 */

const STOP = new Set([
  "going", "here", "just", "with", "the", "this", "that", "from", "meeting",
  "you", "mac", "hey", "sure", "okay", "yeah", "sorry", "actually", "really",
  "a", "an", "not", "so", "very", "still", "also", "about", "on", "in", "at", "to",
]);

/** Capture a surname too when one is spoken: a full name is the difference between findable and not. */
const NAME = /(?:nice to meet you|my name is|i am|i'm|this is|call me)[,\s]+([A-Z][a-z'’-]{1,20}(?:\s[A-Z][a-zA-Z'’-]{1,20})?)/gi;
const ROLE =
  /\bI(?:'m| am)?\s+(?:the\s|a\s|an\s)?((?:co-)?(?:founder|ceo|cto|coo|head|lead|engineer|designer|researcher|investor|pm|product manager|professor|student|recruiter|analyst|consultant)[a-z ]{0,20}?)\b/gi;
const RUNS = /\bI\s+(?:run|lead|head|own|founded|started|manage)\s+([a-z][a-z ]{2,28}?)\b(?=\s+(?:at|for|with)\b|[.,!?]|$)/gi;
/** A floor, not a parser — the keeper model is the real extractor (it hears every phrasing). */
const COMPANY =
  /\b(?:(?:I|we)\s+(?:work|am|'m|are|'re)\s+(?:at|for|with|on)|my\s+company\s+is|we(?:'re| are)\s+called|part of|over at|based at|at|for|with|from|of|joined|work at|works at)\s+((?:[A-Z][\w&'-]*)(?:\s[A-Z][\w&'-]{1,})?)/g;
/** "I'm working on aDNA and ailedger" — the thing someone is building is the best research handle there is. */
const PROJECT =
  /\b(?:working on|work on|building|shipping|launching|behind)\s+([A-Za-z][\w&'.-]*(?:\s[A-Z][\w&'.-]*)?(?:\s*(?:,|and|&)\s*[A-Za-z][\w&'.-]*(?:\s[A-Z][\w&'.-]*)?){0,2})/g;
const COMMITMENT =
  /\b(?:I'?ll|I will|I can|remind me to|let'?s|we should|send me|ping me|email me|follow up|I want to)\b([^.?!]{3,90})/gi;
const CORRECTION =
  /\b(?:actually|no,? it'?s|sorry,? it'?s|it'?s spelled|I meant|I said)[,\s]+(?:it'?s\s+)?([^.?!]{2,60})/gi;
/** "S-A-M" or "S A M" — someone spelling a name out is correcting a mishearing. */
const SPELLED = /\b([A-Za-z](?:[\s.-][A-Za-z]){2,})\b/g;
const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/g;
const HANDLE = /(?:^|\s)(@[a-z0-9_]{2,30})\b/gi;
const URL = /\bhttps?:\/\/[^\s)]+|\b(?:[a-z0-9-]+\.)+(?:com|ai|dev|io|org|net|co)\b(?:\/[^\s)]*)?/gi;

/** Words that follow a name but are never part of it. */
const CONNECTOR = new Set(["from", "of", "at", "with", "for", "and", "in", "on", "who", "here", "over", "works", "work"]);

const CONFIDENCE: Record<SignalKind, number> = {
  name: 0.9, role: 0.75, company: 0.6, commitment: 0.7, ask: 0.8, contact: 0.95, correction: 0.5,
};

function clean(s: string) {
  return s
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[,;:\s-]+|[,;:\s-]+$/g, "")
    .replace(/\s+(?:at|for|with|of|in|and|the|a|an)$/i, "");
}

function push(out: Signal[], kind: SignalKind, value: string, text: string) {
  const v = clean(value);
  if (!v || v.length < 2) return;
  if (out.some((s) => s.kind === kind && s.value.toLowerCase() === v.toLowerCase())) return;
  out.push({ kind, value: v.slice(0, 120), text: clean(text).slice(0, 160), confidence: CONFIDENCE[kind] });
}

function all(re: RegExp, text: string, fn: (m: RegExpExecArray) => void) {
  re.lastIndex = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) fn(m);
}

/** Everything the system noticed in this turn, most confident first. */
export function detect(text: string): Signal[] {
  const out: Signal[] = [];
  if (!text?.trim()) return out;

  all(NAME, text, (m) => {
    // "I am currently working on…" — an adverb is not a name; "I am an engineer" is not "An Engineer".
    const [first, ...rest] = m[1].split(/\s+/);
    if (STOP.has(first.toLowerCase()) || /ly$|ing$|ed$/i.test(first)) return;
    // A surname only counts if it isn't a verb or a connector ("I'm Seth from Oxen AI").
    const surname = rest[0];
    const isSurname =
      surname && !/ing$|ed$/i.test(surname) && !STOP.has(surname.toLowerCase()) && !CONNECTOR.has(surname.toLowerCase());
    const last = isSurname ? ` ${capitalize(surname)}` : "";
    push(out, "name", `${capitalize(first)}${last}`, m[0]);
  });
  all(ROLE, text, (m) => push(out, "role", m[1], m[0]));
  all(RUNS, text, (m) => push(out, "role", m[1], m[0]));
  all(COMPANY, text, (m) => {
    if (!STOP.has(m[1].toLowerCase()) && !out.some((s) => s.kind === "name" && s.value === m[1])) {
      push(out, "company", m[1], m[0]);
    }
  });
  all(PROJECT, text, (m) => {
    for (const part of m[1].split(/\s*(?:,|and|&)\s*/)) {
      if (!STOP.has(part.toLowerCase()) && part.length > 2) push(out, "company", part, m[0]);
    }
  });
  all(COMMITMENT, text, (m) => push(out, "commitment", `${m[0].trim()}`, m[0]));
  all(CORRECTION, text, (m) => push(out, "correction", m[1], m[0]));
  all(SPELLED, text, (m) => {
    const letters = m[1].replace(/[^A-Za-z]/g, "");
    if (letters.length >= 3 && letters.length <= 14) {
      push(out, "correction", capitalize(letters.toLowerCase()), m[0]);
    }
  });
  for (const re of [EMAIL, HANDLE, URL]) all(re, text, (m) => push(out, "contact", m[1] ?? m[0], m[0]));
  for (const q of text.split(/(?<=[.!?])\s+/)) {
    if (q.trim().endsWith("?") && q.trim().length > 8) push(out, "ask", q, q);
  }

  return out.sort((a, b) => b.confidence - a.confidence);
}

/** Processing: what the detections mean for the record. */
export function signalsToMemory(signals: Signal[]) {
  return {
    follow_ups: signals.filter((s) => s.kind === "commitment").map((s) => sentence(s.value)),
    questions: signals.filter((s) => s.kind === "ask").map((s) => s.value),
    company: signals.find((s) => s.kind === "company")?.value,
    role: signals.find((s) => s.kind === "role")?.value,
    contacts: signals.filter((s) => s.kind === "contact").map((s) => s.value),
  };
}

function sentence(s: string) {
  const t = clean(s).replace(/^(?:let'?s|we should|I'?ll|I will|I can|I want to)\s+/i, (m) => m.trim() + " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
