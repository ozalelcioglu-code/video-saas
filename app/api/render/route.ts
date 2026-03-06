import { NextResponse } from "next/server";
import path from "path";
import {
  addBundleToSandbox,
  createSandbox,
  renderMediaOnVercel,
  uploadToVercelBlob,
} from "@remotion/vercel";

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

    const bundleDir = path.resolve(process.cwd(), "public", "remotion-bundle");

    const sandbox = await createSandbox();

    try {
      await addBundleToSandbox({
        sandbox,
        bundleDir,
      });

      const { sandboxFilePath } = await renderMediaOnVercel({
        sandbox,
        compositionId,
        inputProps: body,
        codec: "h264",
        outputFile: "/tmp/video.mp4",
      });

      const { url } = await uploadToVercelBlob({
        sandbox,
        sandboxFilePath,
        contentType: "video/mp4",
        blobToken: process.env.BLOB_READ_WRITE_TOKEN!,
        access: "public",
        blobPath: `renders/${Date.now()}.mp4`,
      });

      return NextResponse.json(
        {
          status: "done",
          url,
        },
        { status: 200 }
      );
    } finally {
      await sandbox.stop();
    }
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