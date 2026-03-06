export type JobStatus = {
  status: "queued" | "bundling" | "rendering" | "done" | "error";
  progress: number;
  createdAt: number;
  url?: string;
  error?: string;
};

// global store (Next dev reload problem çözümü)
const globalForJobs = global as unknown as {
  jobs?: Map<string, JobStatus>;
};

export const jobs =
  globalForJobs.jobs ?? new Map<string, JobStatus>();

if (!globalForJobs.jobs) {
  globalForJobs.jobs = jobs;
}

export function createJob(id: string) {
  jobs.set(id, {
    status: "queued",
    progress: 0,
    createdAt: Date.now(),
  });
}

export function setJob(id: string, data: Partial<JobStatus>) {
  const job = jobs.get(id);

  if (!job) return;

  jobs.set(id, {
    ...job,
    ...data,
  });
}

export function getJob(id: string) {
  return jobs.get(id);
}