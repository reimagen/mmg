import { NextResponse } from "next/server";
import { brief } from "@/lib/memory";

export async function POST(request: Request) {
  const { person_id } = (await request.json()) as { person_id?: string };
  if (!person_id) {
    return NextResponse.json({ error: "person_id required" }, { status: 400 });
  }
  return NextResponse.json({ brief: await brief(person_id) });
}
