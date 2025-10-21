import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateKnowledgeGraph } from '@/lib/engine';
import { createKnowledgeGraphZip } from '@/lib/zip-utils';
import { jobs } from '@/lib/jobs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const useCase = formData.get('useCase') as string;

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Create job
    const jobId = uuidv4();
    
    // Store job info
    jobs.set(jobId, {
      id: jobId,
      status: 'pending',
      useCase,
      fileCount: files.length,
      createdAt: new Date().toISOString(),
    });

    // Start async processing (don't await)
    processJob(jobId, files, useCase, apiKey).catch(error => {
      console.error(`Job ${jobId} failed:`, error);
      const job = jobs.get(jobId);
      if (job) {
        job.status = 'error';
        job.error = error.message || 'Processing failed';
      }
    });

    return NextResponse.json({
      jobId,
      message: 'Job queued successfully',
    });
    } catch (error) {
      console.error('Error creating job:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to create job' },
        { status: 500 }
      );
    }
}

async function processJob(
  jobId: string, 
  files: File[], 
  useCase: string,
  apiKey: string
) {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    // Update status to processing
    job.status = 'processing';

    console.log(`\n🚀 Processing job ${jobId} with ${files.length} files`);

    // Step 1: Read file contents
    const fileContents = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        content: await file.text()
      }))
    );

    // Step 2: Run the engine
    const result = await generateKnowledgeGraph({
      useCase,
      files: fileContents,
      apiKey
    });

    console.log(`✅ Generated ${result.concepts.length} concepts with ${result.metadata.totalLinks} links`);

    // Step 3: Create ZIP file
    const zipBuffer = await createKnowledgeGraphZip(
      result.files,
      result.metadata
    );

    // Step 4: Store result (in production, save to Vercel Blob or similar)
    job.status = 'complete';
    job.completedAt = new Date().toISOString();
    job.resultUrl = `/api/download/${jobId}`;
    job.zipBuffer = zipBuffer; // Store in memory for now
    job.metadata = result.metadata;

    console.log(`✅ Job ${jobId} complete!`);
  } catch (error) {
    console.error(`❌ Job ${jobId} failed:`, error);
    job.status = 'error';
    job.error = error instanceof Error ? error.message : 'Processing failed';
  }
}
