import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

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

    const bundler = await import("@remotion/bundler");
    const renderer = await import("@remotion/renderer");
    const { randomUUID } = await import("crypto");

    const bundled = await bundler.bundle({
      entryPoint,
    });

    let serveUrl: string | undefined;
    let cleanup: null | (() => Promise<void> | void) = null;

    if (typeof bundled === "string") {
      serveUrl = bundled;
    } else {
      serveUrl = (bundled as any).serveUrl ?? (bundled as any).url;
      cleanup = (bundled as any).cleanup ?? null;
    }

    if (!serveUrl) {
      throw new Error("Remotion bundle failed: serveUrl is undefined");
    }

    const comps = await renderer.getCompositions(serveUrl, {
      inputProps,
    });

    const comp = comps.find((c) => c.id === compositionId);

    if (!comp) {
      const available = comps.map((c) => c.id).join(", ");
      throw new Error(
        `Composition '${compositionId}' bulunamadı. Mevcut compositionlar: ${available}`
      );
    }

    const fileName = `${randomUUID()}.mp4`;
    const outPath = path.join(outDir, fileName);
    const publicUrl = `/renders/${fileName}`;

    await renderer.renderMedia({
      serveUrl,
      composition: comp,
      codec: "h264",
      outputLocation: outPath,
      inputProps,
    });

    try {
      if (cleanup) {
        await cleanup();
      }
    } catch {
      // ignore cleanup error
    }

    return NextResponse.json(
      {
        status: "done",
        url: publicUrl,
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