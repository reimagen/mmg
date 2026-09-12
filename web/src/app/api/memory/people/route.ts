import { NextResponse } from "next/server";
import { listPeople } from "@/lib/memory";

export async function GET() {
  return NextResponse.json({ people: listPeople() });
}
