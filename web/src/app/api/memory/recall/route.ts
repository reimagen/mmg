import { NextResponse } from "next/server";
import { brief, recall } from "@/lib/memory";
import { getMode } from "@/lib/supervisor";

export async function POST(request: Request) {
  const body = (await request.json()) as { face_ref?: string; name?: string };
  const person = recall(body);
  if (!person) {
    return NextResponse.json({
      miss: true,
      hint: "stranger — audio-name capture, no camera lookup",
    });
  }
  return NextResponse.json({
    person,
    brief: brief(person.id),
    mode: getMode(),
  });
}
