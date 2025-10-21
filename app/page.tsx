'use client';

import { useState } from 'react';
import { Upload, FileText, Sparkles, Download, Loader2 } from 'lucide-react';

type JobStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [useCase, setUseCase] = useState('research-library');
  const [status, setStatus] = useState<JobStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setStatus('uploading');
    setError(null);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('useCase', useCase);

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to start processing');
      }

      const data = await response.json();
      setJobId(data.jobId);
      setStatus('processing');

      // Poll for completion (in real implementation, use websocket or webhook)
      pollJobStatus(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStatus('error');
    }
  };

  const pollJobStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/status/${id}`);
        const data = await response.json();

        if (data.status === 'complete') {
          setStatus('complete');
          clearInterval(interval);
        } else if (data.status === 'error') {
          setStatus('error');
          setError(data.error || 'Processing failed');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  const handleDownload = async () => {
    if (!jobId) return;
    
    window.location.href = `/api/download/${jobId}`;
  };

  const resetForm = () => {
    setFiles([]);
    setStatus('idle');
    setJobId(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Knowledge Graph Generator
          </h1>
          <p className="text-lg text-slate-600">
            Transform your research notes into an interconnected knowledge graph
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {status === 'idle' || status === 'uploading' ? (
            <form onSubmit={handleSubmit} className="p-8">
              {/* Use Case Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Use Case
                </label>
                <select
                  value={useCase}
                  onChange={(e) => setUseCase(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="research-library">Personal Research Library</option>
                  <option value="course-material">Course/Learning Material</option>
                  <option value="meeting-notes">Meeting Transcripts</option>
                  <option value="project-docs">Project Documentation</option>
                </select>
              </div>

              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Upload Your Content
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".txt,.md,.pdf,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700 mb-1">
                      Click to upload files
                    </p>
                    <p className="text-xs text-slate-500">
                      Supports .txt, .md, .pdf, .docx
                    </p>
                  </label>
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-lg"
                      >
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700 flex-1">
                          {file.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={status === 'uploading'}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {status === 'uploading' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Knowledge Graph
                  </>
                )}
              </button>
            </form>
          ) : status === 'processing' ? (
            <div className="p-12 text-center">
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Processing Your Content
              </h3>
              <p className="text-slate-600">
                Analyzing connections and generating wikilinks...
              </p>
            </div>
          ) : status === 'complete' ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Knowledge Graph Ready!
              </h3>
              <p className="text-slate-600 mb-6">
                Your interconnected notes are ready to download
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDownload}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download ZIP
                </button>
                <button
                  onClick={resetForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-6 rounded-lg transition-colors"
                >
                  Process More
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Processing Failed
              </h3>
              <p className="text-slate-600 mb-6">{error}</p>
              <button
                onClick={resetForm}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-6 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>
            Your files are processed securely and the resulting knowledge graph
            can be imported into Obsidian, Logseq, or Claude Skills.
          </p>
        </div>
      </div>
    </div>
  );
}
