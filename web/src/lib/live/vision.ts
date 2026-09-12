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

export async function describeFrame(frame: string, recentUserText: string): Promise<string | undefined> {
  if (!process.env.OPENAI_API_KEY) return undefined;
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
                "You are the eyes of a social copilot worn on glasses. Boxes in the image mark faces; a blue box with a name is a known person, a green box is unknown. " +
                "Describe the people the wearer is with, using the names from the boxes: appearance, what they hold or wear, setting, anything a good friend would remember. Three short lines. " +
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
