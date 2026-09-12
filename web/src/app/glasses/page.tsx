"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GptLiveClient } from "@/lib/live/browser";
import type { DelegateResult, TranscriptTurn } from "@/lib/live/types";
import type { LoopHealth, Person } from "@/lib/types";
import { forwardVoiceToGlasses, openGlassesMic, type GlassesMic } from "@client/mentra/web/glassesAudio";
import { openGlassesCamera, type GlassesCamera, type SeenFace } from "@client/mentra/web/glassesCamera";
import s from "./glasses.module.css";

/**
 * Mentra Live client on Lui's screen design (web/public/screen.html).
 * Same GptLiveClient as the browser-mic page; audio comes from the glasses over the relay,
 * video is the vision sidecar's annotated stream. See client/mentra/README.md.
 */

const host = typeof window === "undefined" ? "localhost" : window.location.hostname;
const DEFAULT_RELAY = `ws://${host}:8790/ui`;
const DEFAULT_VISION = `ws://${host}:8791/ws`;
const IDLE_HEALTH: LoopHealth = { realtime: "down", memory: "down", enrichment: "idle", input: "browser", glasses: false, model_pool: "openai", hermes: "off" };

type Line = { ts: number; dir: "in" | "out" | "sys"; text: string };

const metLabel = (p: Person) => {
  const t = p.first_met?.ts ? new Date(p.first_met.ts) : null;
  const when = t && !Number.isNaN(t.getTime()) ? t.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase() : "—";
  return `MET ${when}${p.first_met?.event ? ` · ${p.first_met.event.toUpperCase()}` : ""} · ${p.facts.length}F/${p.open_threads.length}T`;
};
const clock = (ts: number) => new Date(ts).toLocaleTimeString(undefined, { hour12: false });

export default function Glasses() {
  const [relayUrl, setRelayUrl] = useState(DEFAULT_RELAY);
  const [visionUrl, setVisionUrl] = useState(DEFAULT_VISION);
  const [health, setHealth] = useState<LoopHealth>(IDLE_HEALTH);
  const [people, setPeople] = useState<Person[]>([]);
  const [active, setActive] = useState<Person | null>(null);
  const [brief, setBrief] = useState("");
  const [cameraStatus, setCameraStatus] = useState("camera idle");
  const [relayStatus, setRelayStatus] = useState("relay idle");
  const [liveStatus, setLiveStatus] = useState("GPT Live idle");
  const [faces, setFaces] = useState<SeenFace[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [voiceToGlasses, setVoiceToGlasses] = useState(false);
  const img = useRef<HTMLImageElement | null>(null);
  const camera = useRef<GlassesCamera | null>(null);
  const mic = useRef<GlassesMic | null>(null);
  const live = useRef<GptLiveClient | null>(null);
  const turnsRef = useRef<TranscriptTurn[]>([]);
  const turnAt = useRef(new WeakMap<TranscriptTurn, number>());
  const sysRef = useRef<Line[]>([]);
  const renderTimer = useRef<number | null>(null);
  const feed = useRef<HTMLDivElement | null>(null);
  const bigFeed = useRef<HTMLDivElement | null>(null);

  // One list for the feed: turns from GPT Live (mutable, per-token deltas) merged with system lines, rendered at most 4x/s.
  const scheduleRender = useCallback(() => {
    if (renderTimer.current !== null) return;
    renderTimer.current = window.setTimeout(() => {
      renderTimer.current = null;
      const turns: Line[] = turnsRef.current.map((t) => ({ ts: turnAt.current.get(t) ?? 0, dir: t.role === "user" ? "in" : "out", text: t.text }));
      setLines([...turns, ...sysRef.current].sort((a, b) => a.ts - b.ts).slice(-200));
    }, 250);
  }, []);
  const sys = useCallback((text: string) => { sysRef.current = [...sysRef.current.slice(-99), { ts: Date.now(), dir: "sys", text }]; scheduleRender(); }, [scheduleRender]);
  const status = (set: (t: string) => void) => (t: string) => { set(t); sys(t); };

  useEffect(() => {
    for (const el of [feed.current, bigFeed.current]) if (el) el.scrollTop = el.scrollHeight;
  }, [lines, expanded]);

  useEffect(() => {
    let down = false;
    const poll = async () => {
      try {
        const [h, p, r] = await Promise.all([
          fetch("/api/health").then((r) => r.json() as Promise<{ health: LoopHealth }>),
          fetch("/api/memory/people").then((r) => r.json() as Promise<{ people: Person[] }>),
          fetch(relayUrl.replace(/^ws/, "http").replace(/\/ui$/, "/status"), { signal: AbortSignal.timeout(800) }).then((r) => r.json() as Promise<{ micLevel: number }>).catch(() => undefined),
        ]);
        setHealth(h.health);
        setPeople([...p.people].sort((a, b) => Date.parse(b.last_seen) - Date.parse(a.last_seen)));
        if (r) setMicLevel(r.micLevel);
        if (down) { down = false; sys("Memory API reachable again — recall is live."); }
      } catch {
        if (!down) { down = true; sys("Memory API unreachable — holding the last card, conversation continues."); }
        setHealth((h) => ({ ...h, realtime: "down", memory: "down" }));
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 2000);
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key.toLowerCase() === "t") setExpanded((x) => !x);
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => { window.clearInterval(id); window.removeEventListener("keydown", onKey); mic.current?.close(); live.current?.stop(); camera.current?.close(); };
  }, [sys]);

  function connectGlasses() {
    camera.current?.close();
    if (img.current) camera.current = openGlassesCamera(visionUrl, img.current, { status: status(setCameraStatus), faces: setFaces });
    mic.current?.close();
    mic.current = openGlassesMic(relayUrl, { status: status(setRelayStatus), frames: () => undefined });
  }

  async function startLive() {
    const stream = mic.current?.stream;
    if (!stream) { sys("connect the glasses first"); return; }
    const client = new GptLiveClient({
      microphone: stream,
      // Demo: GPT Live's voice plays on the laptop. The glasses path is utterance-chunked WAV (0.5-1 s late).
      onOutputTrack: voiceToGlasses ? (track) => forwardVoiceToGlasses(track, relayUrl) : undefined,
      snapshot: () => camera.current?.snapshot(),
      // "Heard: …" is the transcript's job (THEM lines); the header shows only session state.
      onStatus: (t) => { if (!t.startsWith("Heard:")) status(setLiveStatus)(t); },
      onCard: (r: DelegateResult) => {
        setBrief(r.card);
        if (r.person) {
          setActive(r.person);
          const seen = r.thinking.split("\nSeen: ")[1];
          sys(`${r.person.display_name} — ${r.person.face_ref ? "recognized by face" : "name captured"}${seen ? ` · seen: ${seen}` : ""}`);
        } else if (r.miss) sys(`no match — ${r.card}`);
      },
      onTranscript: (turn) => {
        if (turnsRef.current[turnsRef.current.length - 1] !== turn) {
          turnAt.current.set(turn, Date.now());
          turnsRef.current = [...turnsRef.current.slice(-199), turn];
          if (turn.role === "user") void fetch("/api/glasses/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: turn.text, isFinal: false }) });
        }
        scheduleRender();
      },
    });
    live.current = client;
    try { await client.start(); } catch (e) { sys(e instanceof Error ? e.message : "Live failed"); }
  }

  const liveOn = liveStatus.startsWith("Live");
  const feedLive = cameraStatus === "camera live";
  // Card from the last delegation wins; before that, the most recently seen person in memory.
  const shown = active ?? people[0] ?? null;
  const videoLabel = feedLive ? "STREAMING" : cameraStatus.startsWith("camera stalled") ? cameraStatus.replace("camera ", "").toUpperCase() : "NO FEED";
  // A plain function, not a component: a component defined inside render remounts every render and loses its scroll position.
  const renderFeed = (big: boolean) => (
    <div ref={big ? bigFeed : feed} className={big ? s.overlayFeed : s.feed}>
      {lines.map((l, i) => (
        <div key={i} className={`${s.line} ${l.dir === "out" ? s.lineOut : l.dir === "sys" ? s.lineSys : ""}`}>
          <i>{clock(l.ts)}  {l.dir === "in" ? "THEM" : l.dir === "sys" ? "SYS" : "MMG"}</i>
          <span>{l.text}</span>
        </div>
      ))}
      {lines.length === 0 && <div className={s.empty}>LISTENING — SPEECH IN AND WHISPERS OUT LAND HERE</div>}
    </div>
  );

  return (
    <div className={s.root}>
      <div className={s.bar}>
        <div className={s.brand}>MMG</div>
        <div className={s.stat}><div className={`${s.dot} ${liveOn ? s.dotLive : health.realtime === "degraded" ? s.dotWarn : ""}`} />{liveOn ? "SESSION LIVE" : health.realtime === "degraded" ? "SESSION DEGRADED" : "SESSION DOWN"}</div>
        <div className={s.stat}>INPUT <b>{mic.current?.stream ? "GLASSES" : health.input.toUpperCase()}</b></div>
        <div className={s.stat}>MEMORY <b style={{ color: health.memory === "ok" ? undefined : "var(--warn)" }}>{health.memory.toUpperCase()}</b></div>
        <div className={s.stat}>RESEARCH <b>{health.enrichment.toUpperCase()}</b></div>
        <div className={s.stat}>POOL <b>{health.model_pool.toUpperCase()}</b></div>
        <div className={s.stat}>FACES <b>{faces.length}</b></div>
        <div className={s.stat}>MIC <b style={{ color: mic.current?.stream && micLevel < 0.005 ? "var(--warn)" : undefined }}>{mic.current?.stream ? micLevel.toFixed(3) : "OFF"}</b></div>
        {health.realtime === "degraded" && <div className={s.badge}>DEGRADED</div>}
        <div className={s.spacer} />
        <div className={s.meter}>{[6, 10, 8, 13, 9, 11, 7].map((h, i) => <i key={i} className={i === 3 && liveOn ? "on" : ""} style={{ height: h }} />)}</div>
        <div className={s.accent}>{liveStatus.toUpperCase()}</div>
      </div>

      <div className={s.grid}>
        <div className={s.main}>
          <div className={s.label}><span>01 / LIVE POV</span><span>{videoLabel}</span></div>
          <div className={s.pov}>
            <img ref={img} alt="" style={{ opacity: feedLive || cameraStatus.startsWith("camera stalled") ? 1 : 0 }} />
            {!feedLive && !cameraStatus.startsWith("camera stalled") && (
              <div className={s.povEmpty}><div>AWAITING MENTRA FEED — CONNECT GLASSES BELOW<small>{cameraStatus}</small></div></div>
            )}
            {faces.length > 0 && (
              <div className={s.chips}>{faces.map((f, i) => <span key={i} className={`${s.chip} ${f.name ? s.chipKnown : ""}`}>{f.name ? `${f.name.toUpperCase()} ${f.score.toFixed(2)}` : "UNKNOWN"}</span>)}</div>
            )}
          </div>

          <div className={`${s.label} ${s.section}`}><span>02 / ACTIVE PERSON</span></div>
          {shown ? (
            <div>
              <div className={s.name}>
                <h1>{shown.display_name}</h1>
                <div className={s.source}>{shown.face_ref ? `FACE MATCH · ${shown.face_ref.toUpperCase()}` : "NAME HEARD"}</div>
              </div>
              <div className={s.met}>{metLabel(shown)}</div>
              {brief && <div className={s.brief}>{brief}</div>}
              {shown.facts.length > 0 && (
                <div className={s.facts}>
                  {shown.facts.slice(-5).map((f, i) => <div key={i} className={s.fact}><i>{String(i + 1).padStart(2, "0")}</i><span>{f.text}</span><em>{f.source.toUpperCase()}</em></div>)}
                </div>
              )}
              {shown.open_threads.length > 0 && (
                <div className={s.threads}>{shown.open_threads.map((t, i) => <div key={i} className={s.thread}><i>ASK ABOUT</i><span>{t}</span></div>)}</div>
              )}
            </div>
          ) : (
            <div className={s.waiting}>
              <div className={s.ring} />
              <div><h2>waiting for a name</h2><p>a card lands the moment a name is spoken or an enrolled face locks</p></div>
            </div>
          )}
        </div>

        <div className={s.side}>
          <div className={s.label}>
            <span>03 / LIVE TRANSCRIPT</span>
            <span style={{ display: "flex", gap: 10, alignItems: "center" }}><b>{lines.length}</b><button type="button" className={s.btn} onClick={() => setExpanded((x) => !x)}>EXPAND</button></span>
          </div>
          {renderFeed(false)}

          <div className={`${s.label} ${s.section}`}><span>04 / MEMORY</span><b>{people.length}</b></div>
          <div className={s.people}>
            {people.map((p) => (
              <div key={p.id} className={s.person}>
                <header><span>{p.display_name}</span><i className={p.id === shown?.id ? "on" : ""}>{p.id === shown?.id ? "ACTIVE" : p.face_ref ? "FACE" : "NAME"}</i></header>
                <small>{metLabel(p)}</small>
                {p.facts.length > 0 && <p>{p.facts[p.facts.length - 1].text}</p>}
              </div>
            ))}
            {people.length === 0 && <div className={`${s.empty} ${s.emptyBox}`}>MEMORY EMPTY — FILLS AS THE WEARER MEETS PEOPLE</div>}
          </div>

          <div className={s.config}>
            <div className={s.row}>
              <button type="button" className={`${s.btn} ${mic.current?.stream ? s.btnOn : ""}`} onClick={connectGlasses}>1 CONNECT GLASSES</button>
              <button type="button" className={`${s.btn} ${liveOn ? s.btnOn : ""}`} onClick={startLive}>2 START LIVE</button>
              <button type="button" className={s.btn} onClick={() => { live.current?.stop(); setLiveStatus("GPT Live idle"); }}>STOP</button>
            </div>
            <label><input type="checkbox" style={{ width: "auto" }} checked={voiceToGlasses} onChange={(e) => setVoiceToGlasses(e.target.checked)} /> VOICE TO GLASSES (LAGGY)</label>
            <label>RELAY <input value={relayUrl} onChange={(e) => setRelayUrl(e.target.value)} /></label>
            <label>VISION <input value={visionUrl} onChange={(e) => setVisionUrl(e.target.value)} /></label>
            <div>{relayStatus} · {cameraStatus} · T EXPAND TRANSCRIPT</div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className={s.overlay}>
          <div className={s.overlayBar}>
            <span>LIVE TRANSCRIPT — FULL HISTORY</span>
            <span style={{ display: "flex", gap: 14, alignItems: "center" }}><b>{lines.length} LINES</b><button type="button" className={s.btn} onClick={() => setExpanded(false)}>CLOSE · T</button></span>
          </div>
          {renderFeed(true)}
        </div>
      )}
    </div>
  );
}
