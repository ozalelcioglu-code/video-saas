import { NextResponse } from "next/server";
import { generateStoryboard } from "@/lib/ai/openai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const idea = String(body?.idea ?? "").trim();
    const brand = String(body?.brand ?? "Duble-S Technology").trim();
    const ratio = (body?.ratio ?? "square") as "square" | "vertical" | "horizontal";
    const durationSec = Number(body?.durationSec ?? 24);
    const language = (body?.language ?? "en") as "en" | "tr";

    if (!idea) {
      return NextResponse.json({ error: "Missing idea" }, { status: 400 });
    }

    const storyboard = await generateStoryboard({
      idea,
      brand,
      ratio,
      durationSec,
      language,
    });

    return NextResponse.json({ storyboard }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Storyboard failed" }, { status: 500 });
  }
}