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

  if (!job.zipBuffer) {
    return NextResponse.json(
      { error: 'Result file not found' },
      { status: 404 }
    );
  }

  // Return the actual generated ZIP
  return new NextResponse(job.zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="knowledge-graph-${jobId}.zip"`,
    },
  });
}
