import { promises as fs } from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), ".live-open.json");

export async function openLiveIds(): Promise<string[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, "utf8")) as { ids?: string[] };
    return Array.isArray(parsed.ids) ? parsed.ids.filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function writeIds(ids: string[]) {
  await fs.writeFile(FILE, JSON.stringify({ ids }, null, 2));
}

export async function rememberLiveId(id: string) {
  const ids = await openLiveIds();
  if (!ids.includes(id)) ids.push(id);
  await writeIds(ids);
}

export async function hangupLive(id: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { id, status: 503 };
  const response = await fetch(
    `https://api.openai.com/v1/live/sessions/${encodeURIComponent(id)}/hangup`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
    },
  );
  return { id, status: response.status };
}

/** Cuts every session this Next process created. 404 = already dead. */
export async function hangupAllLive() {
  const ids = await openLiveIds();
  const results = await Promise.all(ids.map(hangupLive));
  await writeIds([]);
  return results;
}
