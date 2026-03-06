import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";

import { buildStoryboard } from "@/lib/storyboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ratio = "square" | "vertical" | "horizontal";

function pickCompositionId(ratio: Ratio) {
  if (ratio === "vertical") return "AdVertical";
  if (ratio === "horizontal") return "AdHorizontal";
  return "AdSquare";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const ratio: Ratio = (body?.ratio ?? "square") as Ratio;
    const compositionId = pickCompositionId(ratio);

    const outDir = path.join(process.cwd(), "public", "renders");
    await fs.mkdir(outDir, { recursive: true });

    const storyboard = body?.storyboard ?? buildStoryboard(body);

    const inputProps = {
      ...body,
      storyboard,
    };

    const entryPoint = path.resolve(process.cwd(), "remotion", "entry.ts");

    // Dinamik import: build aşamasında webpack kavgasını azaltır
    const bundler = await import("@remotion/bundler");
    const renderer = await import("@remotion/renderer");
    const remotionVercel = await import("@remotion/vercel");

    // Not:
    // Eğer createSandbox / renderMediaOnVercel tipleri editörde kırmızı görünürse,
    // paket sürüm uyumsuzluğu vardır. Ama bu dosya mantıksal olarak doğru akıştır.
    const serveUrl = await bundler.bundle({
      entryPoint,
    });

    const compositions = await renderer.getCompositions(serveUrl, {
      inputProps,
    });

    const comp = compositions.find((c) => c.id === compositionId);

    if (!comp) {
      const available = compositions.map((c) => c.id).join(", ");
      throw new Error(
        `Composition '${compositionId}' bulunamadı. Mevcut compositionlar: ${available}`
      );
    }

    const fileName = `${randomUUID()}.mp4`;

    const sandbox = await remotionVercel.createSandbox();

    const result = await remotionVercel.renderMediaOnVercel({
      serveUrl,
      composition: comp,
      codec: "h264",
      inputProps,
      sandbox,
      fileName,
    } as any);

    const url =
      (result as any)?.url ??
      (result as any)?.publicUrl ??
      (result as any)?.outputUrl;

    if (!url) {
      throw new Error("Render tamamlandı ama video URL dönmedi");
    }

    return NextResponse.json(
      {
        status: "done",
        url,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        error: err?.message ?? "Render failed",
      },
      { status: 500 }
    );
  }
}