"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GptLiveClient } from "@/lib/live/browser";
import { cutLiveBilling } from "@/lib/live/cut";
import type { DelegateResult } from "@/lib/live/types";
import type { CoachMode, LoopHealth, Person } from "@/lib/types";

type Status = {
  ok: boolean;
  mode: CoachMode;
  health: LoopHealth;
  people: number;
  openai?: boolean;
  live_open?: number;
};

export default function Operator() {
  const liveRef = useRef<GptLiveClient | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [card, setCard] = useState("Waiting for a name…");
  const [cardPerson, setCardPerson] = useState<Person | null>(null);
  const [liveStatus, setLiveStatus] = useState("GPT Live idle");
  const [heard, setHeard] = useState("");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [s, p] = await Promise.all([
      fetch("/api/health").then((r) => r.json() as Promise<Status>),
      fetch("/api/memory/people").then(
        (r) => r.json() as Promise<{ people: Person[] }>,
      ),
    ]);
    setStatus(s);
    setPeople(p.people ?? []);
    if (s.openai === false) {
      setLiveStatus("Add OPENAI_API_KEY to web/.env.local, then restart npm run dev");
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => {
      clearInterval(id);
      liveRef.current?.stop();
    };
  }, [refresh]);

  async function recall(name: string) {
    const result = await fetch("/api/memory/recall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((r) => r.json() as Promise<{ brief?: string }>);
    setCard(result.brief ?? "Unknown. Capture the name out loud.");
  }

  async function toggleMode() {
    const next = status?.mode === "roast" ? "coach" : "roast";
    await fetch("/api/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    });
    liveRef.current?.switchMode(next);
    refresh();
  }

  async function startLive() {
    if (busy || connected) return;
    liveRef.current?.stop();
    setBusy(true);
    const client = new GptLiveClient({
      onStatus: (text) => {
        setLiveStatus(text);
        if (text.startsWith("Live") || text.startsWith("Heard")) setConnected(true);
        if (
          text.includes("ended") ||
          text.includes("hung up") ||
          text.includes("Finishing") ||
          text.includes("Disconnected")
        ) {
          setConnected(false);
        }
      },
      onCard: (result: DelegateResult) => {
        setCard(result.card);
        setCardPerson(result.person);
        void refresh();
      },
      onTranscript: (turn) => {
        if (turn.role === "user") setHeard(turn.text);
      },
    });
    liveRef.current = client;
    try {
      await client.start();
    } catch (error) {
      setLiveStatus(error instanceof Error ? error.message : "Live failed");
      setConnected(false);
    } finally {
      setBusy(false);
      refresh();
    }
  }

  async function stopLive() {
    liveRef.current?.stop();
    cutLiveBilling();
    setConnected(false);
    setHeard("");
    setLiveStatus("GPT Live idle");
    void refresh();
  }

  const featured = cardPerson;
  const billed = connected || busy || (status?.live_open ?? 0) > 0;

  return (
    <main className="flex min-h-full flex-1 flex-col gap-10 px-8 py-8 md:px-16">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="display text-3xl tracking-tight">MMG</p>
        <p className="text-sm text-[var(--hush)]">
          {billed ? "Mac is listening" : "Mac is idle"} ·{" "}
          {status?.health.glasses ? "glasses" : "browser"}
        </p>
      </header>

      <section className="mx-auto w-full max-w-xl rounded-sm bg-[var(--card)] px-8 py-10 text-[var(--ink)] shadow-[8px_12px_0_#110e09]">
        <p className="text-sm text-[var(--hush)]">
          {busy ? "connecting" : "whisper"}
        </p>
        <h1 className="display mt-2 text-4xl leading-tight">
          {featured?.display_name ?? (billed ? "listening" : "—")}
        </h1>
        <p className="mt-4 text-lg leading-relaxed">{card}</p>
        {heard ? (
          <p className="mt-4 text-sm text-[var(--hush)]">heard: {heard}</p>
        ) : null}
      </section>

      <div className="mx-auto flex w-full max-w-xl flex-wrap items-center gap-3">
        {billed ? (
          <button
            type="button"
            onClick={() => void stopLive()}
            className="rounded-sm bg-[var(--live)] px-5 py-3 text-[var(--paper)]"
          >
            {busy ? "Connecting… Hang up" : "Hang up"}
          </button>
        ) : (
          <button
            type="button"
            disabled={status?.openai === false}
            onClick={() => void startLive()}
            className="rounded-sm border border-[var(--live)] px-5 py-3 text-[var(--live)]"
          >
            Talk
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            const name = cardPerson?.display_name ?? people[0]?.display_name;
            if (name) void recall(name);
          }}
          className="rounded-sm bg-[var(--paper)] px-4 py-2 text-[var(--ink)]"
        >
          Recall Jake
        </button>
        <button
          type="button"
          onClick={toggleMode}
          className="rounded-sm border border-[var(--hush)] px-4 py-2"
        >
          Mode: {status?.mode ?? "coach"}
        </button>
        <p className="w-full text-sm text-[var(--hush)]">{liveStatus}</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm text-[var(--hush)]">
          memory · {people.length} enrolled
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {people.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => recall(person.display_name)}
                className="w-full rounded-sm border border-[var(--hush)] px-4 py-3 text-left"
              >
                <span className="display text-xl">{person.display_name}</span>
                <span className="mt-1 block text-sm text-[var(--hush)]">
                  {person.facts[0]?.text}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
