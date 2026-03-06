import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      { status: "error", error: "Missing jobId" },
      { status: 400 }
    );
  }

  const job = await getJob(jobId);

  if (!job) {
    return NextResponse.json(
      { status: "error", error: "Job not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(job, { status: 200 });
}