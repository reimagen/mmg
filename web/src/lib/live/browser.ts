import type { DelegateResult, TranscriptTurn } from "./types";
import { cutLiveBilling } from "./cut";

/** Live is billed per second once POST /api/session returns. Never auto-start. */
export const LIVE_IDLE_MS = 90_000;
export const LIVE_MAX_MS = 8 * 60_000;
export const LIVE_HIDDEN_MS = 15_000;

type LiveEvent = {
  type?: string;
  session?: { id?: string };
  delta?: string;
  text?: string;
  offset_ms?: number;
  error?: { message?: string; code?: string };
  delegation?: { id: string; type: string; target: string };
};

type LiveClientOptions = {
  onStatus: (text: string) => void;
  onCard: (result: DelegateResult) => void;
  onTranscript: (turn: TranscriptTurn) => void;
};

/**
 * Browser WebRTC + client-delegation event loop.
 * https://developers.openai.com/api/docs/guides/voice-webrtc
 * https://developers.openai.com/api/docs/guides/live-delegation?delegation-mode=client
 */
export class GptLiveClient {
  private peer: RTCPeerConnection | undefined;
  private events: RTCDataChannel | undefined;
  private microphone: MediaStream | undefined;
  private audio = new Audio();
  private ready = false;
  private starting = false;
  private hanging = false;
  private transcripts: TranscriptTurn[] = [];
  private lastPersonId: string | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private outputIdleTimer: ReturnType<typeof setTimeout> | undefined;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private maxTimer: ReturnType<typeof setTimeout> | undefined;
  private hiddenTimer: ReturnType<typeof setTimeout> | undefined;
  private startedWait: {
    resolve: () => void;
    reject: (error: Error) => void;
  } | undefined;
  private outputBusy = false;
  private pendingSay: { delegationId: string; content: string }[] = [];
  private options: LiveClientOptions;
  private onPageHide = () => {
    this.hangup("Mac hung up — tab closed.");
  };
  private onVisibility = () => {
    if (document.hidden) {
      this.hiddenTimer = setTimeout(() => {
        this.hangup("Mac hung up — tab was in the background.");
      }, LIVE_HIDDEN_MS);
    } else {
      clearTimeout(this.hiddenTimer);
      this.hiddenTimer = undefined;
    }
  };

  constructor(options: LiveClientOptions) {
    this.options = options;
    this.audio.autoplay = true;
    this.audio.setAttribute("playsinline", "true");
  }

  async start() {
    if (this.peer || this.starting || this.hanging) return;
    this.starting = true;
    this.options.onStatus("Connecting…");
    // Capture the click gesture before the first await so later play() is allowed.
    void this.audio.play().catch(() => undefined);

    const connection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
    this.peer = connection;
    connection.addEventListener("connectionstatechange", () => {
      if (connection.connectionState === "failed") {
        this.hangup("WebRTC failed — VPN or firewall may be blocking audio.");
      }
    });
    connection.addEventListener("iceconnectionstatechange", () => {
      if (connection.iceConnectionState === "failed") {
        this.hangup("ICE failed — audio never reached GPT Live.");
      }
    });

    connection.addEventListener("track", (event) => {
      this.audio.srcObject = new MediaStream([event.track]);
      void this.audio.play().catch(() => {
        this.options.onStatus("Unmute / hit play to hear Mac.");
      });
    });

    try {
      this.microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mic = this.microphone.getAudioTracks()[0];
      if (!mic) throw new Error("Browser gave mic permission but no audio track");
      mic.enabled = true;
      connection.addTrack(mic, this.microphone);
      this.options.onStatus(`Mic ${mic.label || "default"} — finding a network path…`);

      const channel = connection.createDataChannel("oai-events");
      this.events = channel;
      channel.addEventListener("open", () => {
        if (!this.ready) {
          this.options.onStatus("Live · events open — waiting for session.started");
        }
      });
      channel.addEventListener("message", (event) => {
        void this.onChannelMessage(event.data);
      });
      channel.addEventListener("close", () => {
        if (this.hanging) return;
        if (!this.ready) return;
        this.cleanup();
        this.options.onStatus("Disconnected.");
      });

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await waitForIce(connection);
      this.options.onStatus("Mic on — starting Mac…");

      const sdp = connection.localDescription?.sdp;
      if (!sdp) throw new Error("Missing local SDP offer");

      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp }),
      });
      if (!response.ok) {
        throw new Error(await sessionError(response));
      }
      const result = (await response.json()) as {
        session?: { id: string };
        transport?: { sdp?: string };
      };
      const answer = result.transport?.sdp;
      if (!answer) throw new Error("Live session missing SDP answer");
      await connection.setRemoteDescription({ type: "answer", sdp: answer });
      this.armSpendGuards();
      this.options.onStatus(
        `Live · ${result.session?.id ?? "session"} — waiting for Mac to come up…`,
      );
      await this.waitForStarted(12_000);
    } catch (error) {
      this.hangup(
        error instanceof Error
          ? error.message
          : "Live failed — session closed so it would not keep billing.",
      );
      throw error;
    } finally {
      this.starting = false;
    }
  }

  stop() {
    this.hangup("Mac hung up.");
  }

  switchMode(mode: "coach" | "roast") {
    this.send({
      type: "session.instructions.append",
      event_id: `mode_${Date.now()}`,
      delegation_id: null,
      content:
        mode === "roast"
          ? "Mode is now roast-me. One dry jab per turn after memory confirms who they are."
          : "Mode is now coach. Whisper useful context. Do not roast.",
    });
  }

  private hangup(reason: string) {
    if (this.hanging) return;
    this.hanging = true;
    this.clearSpendGuards();
    cutLiveBilling();
    this.startedWait?.reject(new Error(reason));
    this.startedWait = undefined;
    if (this.events?.readyState === "open") {
      this.send({ type: "session.close" });
      this.options.onStatus(reason);
      this.closeTimer = setTimeout(() => this.cleanup(), 2_000);
      return;
    }
    this.cleanup();
    this.options.onStatus(reason);
  }

  private armSpendGuards() {
    this.clearSpendGuards();
    window.addEventListener("pagehide", this.onPageHide);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.bumpIdle();
    this.maxTimer = setTimeout(() => {
      this.hangup("Mac hung up — 8 min cap so Live would not keep billing.");
    }, LIVE_MAX_MS);
  }

  private bumpIdle() {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.hangup("Mac hung up — 90s of silence.");
    }, LIVE_IDLE_MS);
  }

  private clearSpendGuards() {
    clearTimeout(this.idleTimer);
    clearTimeout(this.maxTimer);
    clearTimeout(this.hiddenTimer);
    this.idleTimer = undefined;
    this.maxTimer = undefined;
    this.hiddenTimer = undefined;
    window.removeEventListener("pagehide", this.onPageHide);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  private waitForStarted(ms: number) {
    if (this.ready) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.startedWait = undefined;
        const ice = this.peer?.iceConnectionState ?? "unknown";
        const dc = this.events?.readyState ?? "missing";
        reject(
          new Error(
            `Mic is on, but GPT Live never started (ICE ${ice}, events ${dc}). Session closed.`,
          ),
        );
      }, ms);
      this.startedWait = {
        resolve: () => {
          clearTimeout(timer);
          this.startedWait = undefined;
          resolve();
        },
        reject: (error) => {
          clearTimeout(timer);
          this.startedWait = undefined;
          reject(error);
        },
      };
    });
  }

  private async onChannelMessage(data: unknown) {
    const text = await decodeChannelData(data);
    if (!text) return;
    try {
      await this.onEvent(JSON.parse(text) as LiveEvent);
    } catch {
      /* ignore malformed frames */
    }
  }

  private async onEvent(event: LiveEvent) {
    const type = event.type ?? "";
    if (type === "error" || type === "session.error") {
      this.options.onStatus(event.error?.message ?? "Live error — still listening.");
      return;
    }
    if (type === "session.started") {
      this.ready = true;
      this.startedWait?.resolve();
      this.bumpIdle();
      this.options.onStatus("Live · listening — talk in this tab");
      return;
    }
    if (type === "session.closed") {
      this.cleanup();
      if (!this.hanging) this.options.onStatus("Conversation ended.");
      return;
    }
    const spoken = event.delta ?? event.text;
    if (type === "session.input_transcript.delta" && spoken) {
      this.bumpIdle();
      this.pushTranscript("user", spoken);
      this.options.onStatus("Heard: " + this.lastUserText());
      return;
    }
    if (type === "session.output_transcript.delta" && spoken) {
      this.bumpIdle();
      this.pushTranscript("assistant", spoken);
      this.markOutputBusy();
      return;
    }
    if (type === "session.delegation.created" && event.delegation?.id) {
      this.bumpIdle();
      this.markOutputBusy();
      await this.handleDelegation(event.delegation.id);
    }
  }

  private lastUserText() {
    const turns = this.transcripts.filter((turn) => turn.role === "user");
    return turns[turns.length - 1]?.text.trim() || "…";
  }

  private async handleDelegation(delegationId: string) {
    // Quiet context now. Do not speak the card until output is idle (LIVE-0002).
    this.send({
      type: "session.thinking.append",
      event_id: `think_${Date.now()}`,
      delegation_id: delegationId,
      content:
        "Sent to Mac's memory. The whisper card arrives as a later result; do not invent it.",
    });

    try {
      const result = await fetch("/api/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delegation_id: delegationId,
          transcripts: this.transcripts.slice(-12),
          last_person_id: this.lastPersonId,
        }),
      }).then((r) => r.json() as Promise<DelegateResult>);

      if (result.person) this.lastPersonId = result.person.id;
      this.options.onCard(result);

      if (result.thinking) {
        this.send({
          type: "session.thinking.append",
          event_id: `think2_${Date.now()}`,
          delegation_id: delegationId,
          content: result.thinking,
        });
      }
      if (result.commentary) {
        this.queueCommentary(delegationId, result.commentary);
      }
    } catch {
      this.options.onStatus("Delegation skipped — conversation continues.");
    }
  }

  /** LIVE-0002: commentary during the bridge sentence is swallowed ~8/10. */
  private queueCommentary(delegationId: string, content: string) {
    this.pendingSay.push({ delegationId, content });
    if (!this.outputBusy) this.flushCommentary();
  }

  private markOutputBusy() {
    this.outputBusy = true;
    clearTimeout(this.outputIdleTimer);
    this.outputIdleTimer = setTimeout(() => {
      this.outputBusy = false;
      this.flushCommentary();
    }, 700);
  }

  private flushCommentary() {
    if (this.outputBusy || !this.pendingSay.length) return;
    const next = this.pendingSay.shift();
    if (!next) return;
    this.send({
      type: "session.commentary.append",
      event_id: `say_${Date.now()}`,
      delegation_id: next.delegationId,
      content: next.content,
    });
    this.markOutputBusy();
  }

  private pushTranscript(role: TranscriptTurn["role"], delta: string) {
    const last = this.transcripts[this.transcripts.length - 1];
    if (last && last.role === role) {
      last.text += delta;
    } else {
      this.transcripts.push({ role, text: delta });
    }
    const current = this.transcripts[this.transcripts.length - 1];
    if (current) this.options.onTranscript(current);
  }

  private send(payload: Record<string, unknown>) {
    if (this.events?.readyState !== "open") return;
    this.events.send(JSON.stringify(payload));
  }

  private cleanup() {
    this.startedWait?.reject(new Error("Live session closed before it started."));
    this.startedWait = undefined;
    this.clearSpendGuards();
    clearTimeout(this.closeTimer);
    clearTimeout(this.outputIdleTimer);
    this.pendingSay = [];
    this.outputBusy = false;
    this.microphone?.getTracks().forEach((track) => track.stop());
    this.events?.close();
    this.peer?.close();
    this.audio.srcObject = null;
    this.ready = false;
    this.starting = false;
    this.hanging = false;
    this.peer = undefined;
    this.events = undefined;
    this.microphone = undefined;
  }
}

async function decodeChannelData(data: unknown) {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(data as ArrayBufferView);
  }
  if (typeof Blob !== "undefined" && data instanceof Blob) return data.text();
  return String(data);
}

async function sessionError(response: Response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as { error?: string; detail?: string };
    return json.detail || json.error || text.slice(0, 240) || "Live session failed";
  } catch {
    return text.slice(0, 240) || "Live session failed";
  }
}

function waitForIce(connection: RTCPeerConnection) {
  if (connection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      connection.removeEventListener("icegatheringstatechange", onState);
      connection.removeEventListener("icecandidate", onCandidate);
      resolve();
    };
    const onState = () => {
      if (connection.iceGatheringState === "complete") finish();
    };
    const onCandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate === null) finish();
    };
    // STUN can hang forever on VPN / mDNS. Send whatever SDP we have.
    const timer = setTimeout(finish, 2_500);
    connection.addEventListener("icegatheringstatechange", onState);
    connection.addEventListener("icecandidate", onCandidate);
    onState();
  });
}
