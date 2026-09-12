# GPT Live loop — measured (LIVE-0002)

Source: team probe 2026-09-12 (`gpt-live-hermes-demo.md`, LIVE-0001/0002).
The live agent is **Mac**. MMG uses the same **client-delegation** events over **browser WebRTC** (not the PCM `say` file). Hall/Hermes is P1. Local Exa is the **fast lane**.

## Clocks (one live Hermes run)

| Step | Delta |
|---|---|
| User stops talking → `session.delegation.created` | **0.8–0.95 s** (stable) |
| Hall `send` ack | **~20 ms** |
| Hermes `emit_handoff` packet | **~17 s** (one Hermes turn) |
| Live speaks the packet after append | **~0.7 s** |

The live model can keep talking while the room works (“I’ll check”).

## Loop we implement

```
mic → GPT Live
     → session.input_transcript.delta   (keep in the app)
     → session.delegation.created {id}  (no task text — use the transcript)
     → thinking.append  immediately     (quiet: “banking / checking”)
     → POST /api/delegate               (memory upsert/log/brief; enqueue Exa)
     → UI card = ground truth
     wait until output-transcript is idle
     → commentary.append  (whisper / Exa line / Hermes say)
     → hall consumed(packet_id) only after the card is on screen
```

## Rules (do not regress)

1. **Delegation id is opaque.** Collect text from transcript deltas, not from the event.
2. **Do not append the spoken result while Live is bridging.** Immediate `commentary.append` was swallowed 8/10. After output-transcript idle, 3/3 spoken. Gate on idle. Hermes is never faster than that.
3. **Verbatim needs an instruction:** “When a result arrives, read it aloud word for word, exactly as written.” Without it, every result was paraphrased. UI card stays ground truth either way.
4. **`commentary.appended` ≠ spoken.** It means “in context” (~0.63 s). Onset is `session.output_transcript.delta`.
5. **Ack is not the answer.** Hall `send` ack is ~20 ms. Do not wait for the packet on the Live path.
6. **Never test on room `cos`.** Use `research` (MMG) or `demo`. `cos` briefing is ~18 s and pollutes durable history.
7. **`hermes serve` must be running the `emit_handoff` build.** Stale daemon → no packet.

## Two lanes (MMG)

| Lane | Budget | Path |
|---|---|---|
| **Fast (P0)** | 1–3 s | Local Exa / treg → `commentary.append` after idle. Spend gate = timeout + skip. |
| **Slow (P1)** | ~17 s | Hall `send("research", …)` → Hermes packet → same append gate. |

No router yet: spoken name / new fact → memory fast; research → Exa, or Hermes if `HERMES_ENABLED=1`.
