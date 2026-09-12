/**
 * Paste into the Mentra miniapp background after `bunx create-mentra-miniapp`.
 *
 * registerMiniapp((session) => { ... })
 *
 * APIs: https://docs.mentraglass.com/app-devs/core-concepts/session.md
 */

const API = process.env.MMG_API_URL ?? "http://localhost:3000";

type Session = {
  capabilities: { display?: { width: number; height: number } } | null;
  transcription: {
    on: (handler: (data: { text: string; isFinal: boolean }) => void) => () => void;
  };
  display: {
    render: (
      elements: Array<{
        type: "text";
        id: string;
        box: { x: number; y: number; w: number; h: number };
        text: string;
      }>,
    ) => void;
  };
  on: (event: "ready", handler: () => void) => void;
};

export function attachMmG(session: Session) {
  session.on("ready", () => {
    paint(session, "MMG ready — listening");
  });

  session.transcription.on(async (data) => {
    if (!data.isFinal) {
      paint(session, data.text);
      return;
    }

    const response = await fetch(`${API}/api/glasses/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: data.text, isFinal: true }),
    });
    const payload = (await response.json()) as {
      person?: { display_name: string };
      enrolled?: { display_name: string };
      miss?: boolean;
    };

    if (payload.enrolled) {
      paint(session, `enrolled ${payload.enrolled.display_name} (name only)`);
      return;
    }
    if (payload.miss) {
      paint(session, "unknown — say “nice to meet you, NAME”");
      return;
    }

    const card = await fetch(`${API}/api/memory/recall`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: payload.person?.display_name }),
    }).then((r) => r.json() as Promise<{ brief?: string }>);

    paint(session, card.brief ?? data.text);
  });
}

function paint(session: Session, text: string) {
  const d = session.capabilities?.display;
  session.display.render([
    {
      type: "text",
      id: "whisper",
      box: { x: 0, y: 0, w: d?.width ?? 576, h: d?.height ?? 288 },
      text,
    },
  ]);
}
