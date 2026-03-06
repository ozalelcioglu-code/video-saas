import path from "path";
import fs from "fs/promises";

export type JobStatus = {
  status: "queued" | "bundling" | "rendering" | "done" | "error";
  progress: number;
  createdAt: number;
  url?: string;
  error?: string;
};

const JOBS_DIR = path.join(process.cwd(), "tmp", "jobs");

async function ensureJobsDir() {
  await fs.mkdir(JOBS_DIR, { recursive: true });
}

function getJobFile(id: string) {
  return path.join(JOBS_DIR, `${id}.json`);
}

export async function createJob(id: string) {
  await ensureJobsDir();

  const initial: JobStatus = {
    status: "queued",
    progress: 0,
    createdAt: Date.now(),
  };

  await fs.writeFile(getJobFile(id), JSON.stringify(initial, null, 2), "utf8");
}

export async function setJob(id: string, data: Partial<JobStatus>) {
  await ensureJobsDir();

  const file = getJobFile(id);

  let current: JobStatus = {
    status: "queued",
    progress: 0,
    createdAt: Date.now(),
  };

  try {
    const raw = await fs.readFile(file, "utf8");
    current = JSON.parse(raw) as JobStatus;
  } catch {
    // file yoksa varsayılanla devam
  }

  const next: JobStatus = {
    ...current,
    ...data,
  };

  await fs.writeFile(file, JSON.stringify(next, null, 2), "utf8");
}

export async function getJob(id: string) {
  try {
    const raw = await fs.readFile(getJobFile(id), "utf8");
    return JSON.parse(raw) as JobStatus;
  } catch {
    return null;
  }
}