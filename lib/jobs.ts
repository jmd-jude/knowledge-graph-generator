// Use global to persist across hot reloads in dev
const globalForJobs = global as unknown as { jobs: Map<string, any> };

export const jobs = globalForJobs.jobs ?? new Map<string, any>();

if (process.env.NODE_ENV !== 'production') {
  globalForJobs.jobs = jobs;
}