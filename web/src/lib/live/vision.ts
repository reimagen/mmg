/**
 * Vision during delegation. gpt-live-1 takes no images (model page: unsupported
 * modalities image, video), so the delegation frame goes to a vision model on
 * the Responses API and comes back as text for GPT Live's `thinking`.
 * The frame is the sidecar's annotated frame: boxes with names for known
 * people, so the model can refer to them by name (one source of truth).
 * Docs: https://developers.openai.com/api/docs/guides/live-delegation#add-images-and-visual-context
 */
const VISION_MODEL = process.env.VISION_MODEL ?? "gpt-5.6-luna";
const VISION_TIMEOUT_MS = 6_000;

export async function describeFrame(frame: string, recentUserText: string, faces: { name: string | null }[] = []): Promise<string | undefined> {
  if (!process.env.OPENAI_API_KEY) return undefined;
  const known = faces.filter((f) => f.name).map((f) => f.name);
  const facesLine = faces.length === 0 ? "no faces detected" : `${known.length ? `known: ${known.join(", ")}` : "no known faces"}, ${faces.length - known.length} unknown`;
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
    body: JSON.stringify({
      model: VISION_MODEL,
      reasoning: { effort: "low" },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "You are the eyes of a social copilot worn on glasses. Boxes mark faces: blue with a name = known person, green = unknown. " +
                `Face recognition says: ${facesLine}. Trust it over what you read off the labels. ` +
                "One line, under 20 words, only about the people in boxes (name if known, one memorable detail each). No setting, no scene, no laptops or plants. " +
                "If no boxes: reply exactly 'no one in view'. " +
                `Recent words from the wearer: "${recentUserText.slice(-300)}"`,
            },
            { type: "input_image", image_url: frame, detail: "low" },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`vision ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { output?: { type: string; content?: { type: string; text?: string }[] }[] };
  return json.output?.find((o) => o.type === "message")?.content?.find((c) => c.type === "output_text")?.text?.trim();
}
