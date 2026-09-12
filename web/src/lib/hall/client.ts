/**
 * Hall client — slow plane to Hermes.
 *
 * Real contract is WebSocket frames on HALL_WS_URL (`send` / `stop` / `consumed`)
 * plus inbound `packet` frames. Docs: docs/HERMES.md and
 * docs/chief_of_staff_architecture.md.
 *
 * No-ops unless HERMES_ENABLED=1. Never await a packet on the Live path.
 * If send fails, the local Exa queue is the fallback.
 *
 * WS auth uses Bearer headers, so this prefers the `ws` package
 * (`cd web && npm i ws`). Native WebSocket is used only if `ws` is missing
 * and HALL_TOKEN is empty.
 */

import { createRequire } from "node:module";
import type { HallPacket } from "../types";

export type HallSend = {
  room: string;
  text: string;
};

type HallFrame = {
  type: "send" | "stop" | "consumed";
  room: string;
  text?: string;
  packet_id?: string;
  request_id: string;
};

type SocketLike = {
  send: (data: string) => void;
  readyState: number;
};

let lastPacket: HallPacket | null = null;
let socket: SocketLike | null = null;
let connecting: Promise<SocketLike | null> | null = null;

export function hermesEnabled() {
  return process.env.HERMES_ENABLED === "1" && Boolean(process.env.HALL_WS_URL);
}

export function getLastHallPacket() {
  return lastPacket;
}

/** Ingest a 5-field packet (WS listener or test POST). Card `say` is ground truth. */
export function ingestHallPacket(packet: HallPacket) {
  lastPacket = packet;
  return packet;
}

/** Fire-and-forget. Returns false if hall is off or the send failed — caller falls back. */
export async function hallSend(msg: HallSend): Promise<boolean> {
  return sendFrame({
    type: "send",
    room: msg.room,
    text: msg.text,
    request_id: crypto.randomUUID(),
  });
}

export async function hallStop(room: string): Promise<boolean> {
  return sendFrame({
    type: "stop",
    room,
    request_id: crypto.randomUUID(),
  });
}

export async function hallConsumed(packetId: string, room: string): Promise<boolean> {
  return sendFrame({
    type: "consumed",
    room,
    packet_id: packetId,
    request_id: crypto.randomUUID(),
  });
}

async function sendFrame(frame: HallFrame): Promise<boolean> {
  if (!hermesEnabled()) return false;
  const url = process.env.HALL_WS_URL;
  if (!url) return false;

  try {
    const ws = await connect(url, process.env.HALL_TOKEN);
    if (!ws) return false;
    ws.send(JSON.stringify(frame));
    return true;
  } catch {
    return false;
  }
}

async function connect(url: string, token?: string): Promise<SocketLike | null> {
  if (socket && socket.readyState === 1) return socket;
  if (connecting) return connecting;

  connecting = openSocket(url, token)
    .then((ws) => {
      socket = ws;
      return ws;
    })
    .catch(() => {
      connecting = null;
      socket = null;
      return null;
    });

  return connecting;
}

async function openSocket(url: string, token?: string): Promise<SocketLike> {
  const fromWs = tryNodeWs(url, token);
  if (fromWs) return fromWs;

  if (token) {
    throw new Error("hall Bearer auth needs the ws package (npm i ws)");
  }

  return openNative(url);
}

function tryNodeWs(url: string, token?: string): Promise<SocketLike> | null {
  try {
    const require = createRequire(import.meta.url);
    const WS = require("ws") as new (
      address: string,
      options?: { headers?: Record<string, string>; handshakeTimeout?: number },
    ) => {
      send: (data: string) => void;
      readyState: number;
      once: (event: string, cb: (err?: Error) => void) => void;
      on: (event: string, cb: (data?: unknown) => void) => void;
    };
    const ws = new WS(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      handshakeTimeout: 800,
    });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("hall timeout")), 800);
      ws.once("open", () => {
        clearTimeout(timer);
        ws.on("message", (data) => onFrame(String(data)));
        ws.on("close", dropSocket);
        resolve(ws);
      });
      ws.once("error", (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  } catch {
    return null;
  }
}

function openNative(url: string): Promise<SocketLike> {
  const WS = globalThis.WebSocket;
  if (!WS) return Promise.reject(new Error("no WebSocket"));
  const ws = new WS(url);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("hall timeout"));
    }, 800);
    ws.addEventListener("open", () => {
      clearTimeout(timer);
      ws.addEventListener("message", (event) => onFrame(String(event.data)));
      ws.addEventListener("close", dropSocket);
      resolve(ws);
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("hall ws error"));
    });
  });
}

function onFrame(raw: string) {
  try {
    const msg = JSON.parse(raw) as {
      type?: string;
      room?: string;
      state?: string;
      say?: string;
      did?: string;
      need?: string;
      next?: string;
      packet_id?: string;
    };
    if (msg.type === "packet" && msg.say) {
      ingestHallPacket({
        room: msg.room ?? "research",
        state: msg.state ?? "",
        say: msg.say,
        did: msg.did ?? "",
        need: msg.need ?? "",
        next: msg.next ?? "",
        packet_id: msg.packet_id,
      });
    }
  } catch {
    /* ignore malformed frames */
  }
}

function dropSocket() {
  socket = null;
  connecting = null;
}
