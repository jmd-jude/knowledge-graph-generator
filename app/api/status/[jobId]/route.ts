import { NextRequest, NextResponse } from 'next/server';

// Import jobs from the generate route's module
// In dev mode, we need to use a workaround
let jobs: Map<string, any>;

// Try to get the shared jobs map
try {
  jobs = require('@/lib/jobs').jobs;
} catch {
  jobs = new Map();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  console.log('Status check for:', jobId);
  console.log('Jobs in map:', Array.from(jobs.keys()));

  const job = jobs.get(jobId);

  if (!job) {
    return NextResponse.json(
      { error: 'Job not found', jobId, availableJobs: Array.from(jobs.keys()) },
      { status: 404 }
    );
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    useCase: job.useCase,
    fileCount: job.fileCount,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    resultUrl: job.resultUrl,
  });
}