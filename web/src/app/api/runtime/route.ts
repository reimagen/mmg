import { NextResponse } from "next/server";
import { backendName, listTraces } from "@/lib/context/runtime";
import { listPeople } from "@/lib/memory";
import { recentInteractions } from "@/lib/memory/sqlite";
import { renderPersonPage, WIKI_DIR } from "@/lib/memory/wiki";
import { getHealth } from "@/lib/supervisor";
import { listJobs } from "@/lib/enrichment/queue";

/** One call behind the runtime rail: what the backend is, what it just did, and the page it maintains. */
export async function GET(request: Request) {
  const focus = new URL(request.url).searchParams.get("person");
  const people = await listPeople();
  const person = focus ? people.find((p) => p.id === focus) : undefined;
  return NextResponse.json({
    backend: {
      kind: backendName(),
      model: backendName() === "model" ? process.env.BACKEND_MODEL ?? "gpt-5.4-mini" : null,
      store: "SQLite · node:sqlite · web/data/memory.db",
      wiki_dir: WIKI_DIR,
    },
    health: getHealth(),
    counts: { people: people.length, enrolled: people.filter((p) => p.enrolled).length },
    jobs: listJobs().slice(-4),
    traces: listTraces(),
    page: person ? renderPersonPage(person, recentInteractions(person.id)) : null,
  });
}
