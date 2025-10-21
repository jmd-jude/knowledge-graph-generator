import { NextRequest, NextResponse } from 'next/server';
import { jobs } from '@/lib/jobs';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const job = jobs.get(jobId);

  if (!job) {
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    );
  }

  if (job.status !== 'complete') {
    return NextResponse.json(
      { error: 'Job not complete' },
      { status: 400 }
    );
  }

  if (!job.downloadUrl) {
    return NextResponse.json(
      { error: 'Download link not available' },
      { status: 404 }
    );
  }

  // Redirect to Vercel Blob URL for download
  return NextResponse.redirect(job.downloadUrl);
}