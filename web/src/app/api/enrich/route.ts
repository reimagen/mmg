import { NextResponse } from "next/server";
import { enqueueEnrichment, killEnrichment, listJobs } from "@/lib/enrichment/queue";

export async function GET() {
  return NextResponse.json({ jobs: listJobs() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    person_id?: string;
    query?: string;
    source?: "exa" | "treg";
    kill?: boolean;
  };
  if (body.kill) {
    killEnrichment();
    return NextResponse.json({ killed: true, jobs: listJobs() });
  }
  if (!body.person_id) {
    return NextResponse.json({ error: "person_id required" }, { status: 400 });
  }
  // query is a human label; researchPerson builds the real query from the person's detected context.
  const job = enqueueEnrichment(body.person_id, body.query ?? body.person_id, body.source ?? "exa");
  return NextResponse.json(job, { status: 202 });
}
