import type { DelegateResult, TranscriptTurn } from "./types";

type LiveEvent = {
  type: string;
  session?: { id: string };
  delta?: string;
  offset_ms?: number;
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
  private transcripts: TranscriptTurn[] = [];
  private lastPersonId: string | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private options: LiveClientOptions;

  constructor(options: LiveClientOptions) {
    this.options = options;
    this.audio.autoplay = true;
  }

  async start() {
    this.options.onStatus("Connecting…");
    const connection = new RTCPeerConnection();
    this.peer = connection;

    connection.addEventListener("track", (event) => {
      this.audio.srcObject = new MediaStream([event.track]);
      this.audio.play().catch(() => {
        this.options.onStatus("Hit play on the audio control to hear GPT Live.");
      });
    });

    this.microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of this.microphone.getAudioTracks()) {
      connection.addTrack(track, this.microphone);
    }

    const channel = connection.createDataChannel("oai-events");
    this.events = channel;
    channel.addEventListener("message", (event) => {
      void this.onEvent(JSON.parse(String(event.data)) as LiveEvent);
    });

    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    await waitForIce(connection);

    const sdp = connection.localDescription?.sdp;
    if (!sdp) throw new Error("Missing local SDP offer");

    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sdp }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || "Live session failed");
    }
    const result = (await response.json()) as {
      session: { id: string };
      transport: { sdp: string };
    };
    await connection.setRemoteDescription({
      type: "answer",
      sdp: result.transport.sdp,
    });
    this.options.onStatus("Negotiating… " + result.session.id);
  }

  stop() {
    if (!this.ready || this.events?.readyState !== "open") {
      this.cleanup();
      return;
    }
    this.options.onStatus("Finishing…");
    this.send({ type: "session.close" });
    this.closeTimer = setTimeout(() => this.cleanup(), 8_000);
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

  private async onEvent(event: LiveEvent) {
    if (event.type === "session.started") {
      this.ready = true;
      this.options.onStatus("Live · " + (event.session?.id ?? "session"));
      return;
    }
    if (event.type === "session.closed") {
      this.cleanup();
      this.options.onStatus("Conversation ended.");
      return;
    }
    if (event.type === "session.input_transcript.delta" && event.delta) {
      this.pushTranscript("user", event.delta);
      return;
    }
    if (event.type === "session.output_transcript.delta" && event.delta) {
      this.pushTranscript("assistant", event.delta);
      return;
    }
    if (event.type === "session.delegation.created" && event.delegation?.id) {
      await this.handleDelegation(event.delegation.id);
    }
  }

  private async handleDelegation(delegationId: string) {
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
          event_id: `think_${Date.now()}`,
          delegation_id: delegationId,
          content: result.thinking,
        });
      }
      if (result.commentary) {
        this.send({
          type: "session.commentary.append",
          event_id: `say_${Date.now()}`,
          delegation_id: delegationId,
          content: result.commentary,
        });
      }
    } catch {
      this.options.onStatus("Delegation skipped — conversation continues.");
    }
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
    clearTimeout(this.closeTimer);
    this.microphone?.getTracks().forEach((track) => track.stop());
    this.events?.close();
    this.peer?.close();
    this.audio.srcObject = null;
    this.ready = false;
    this.peer = undefined;
    this.events = undefined;
    this.microphone = undefined;
  }
}

function waitForIce(connection: RTCPeerConnection) {
  if (connection.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      connection.removeEventListener("icegatheringstatechange", onState);
      reject(new Error("Timed out gathering ICE candidates"));
    }, 10_000);
    function onState() {
      if (connection.iceGatheringState !== "complete") return;
      clearTimeout(timeout);
      connection.removeEventListener("icegatheringstatechange", onState);
      resolve();
    }
    connection.addEventListener("icegatheringstatechange", onState);
    onState();
  });
}
