# Knowledge Graph Generator

Transform your research notes, course materials, meeting transcripts, and project docs into interconnected knowledge graphs with wikilinks.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Get your API key at: https://console.anthropic.com/

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

### 4. Deploy to Vercel

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Deploy
vercel

# Add environment variable in Vercel dashboard:
# ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Features

- **Research Library Mode** - Connect concepts across papers, articles, and notes
- **Course Material Mode** - Build learning paths with prerequisites and dependencies  
- **Meeting Notes Mode** - Link decisions, action items, and topics
- **Project Docs Mode** - Connect technical concepts and architecture decisions

## How It Works

1. **Upload** - Drop in your .txt, .md, .pdf, or .docx files
2. **Process** - AI extracts concepts and identifies relationships
3. **Download** - Get a ZIP with wikilinked markdown files
4. **Use** - Import into Obsidian, Logseq, or Claude Desktop Skills

## Architecture

```
Next.js 14 App
├── Frontend (app/page.tsx)
│   └── File upload + status UI
├── API (app/api/)
│   ├── /generate - Process files with engine
│   ├── /status/[jobId] - Check processing status
│   └── /download/[jobId] - Download ZIP
└── Engine (lib/engine.ts)
    ├── Prompt templates per use case
    ├── Concept extraction (Claude API)
    ├── Wikilink generation
    └── ZIP packaging
```

## Current State: Phase 2 ✅

- ✅ Clean UI for file upload
- ✅ API route structure
- ✅ **Full engine implementation**
- ✅ **Real LLM processing with Claude**
- ✅ **Wikilink generation**
- ✅ **ZIP file creation**

## Next Steps: Phase 3 (Optional Improvements)

1. **Add Database** (Railway Postgres)
   - Persistent job storage
   - Job history and analytics
   - User accounts (optional)

2. **Add Proper File Storage**
   - Vercel Blob for uploaded files
   - Vercel Blob for generated ZIPs
   - Better scalability

3. **Enhancements**
   - Batch processing for large files
   - Progress indicators with real-time updates
   - Preview before download
   - Custom concept extraction rules

## Stack

- **Frontend**: Next.js 14 + React + Tailwind CSS
- **API**: Next.js API Routes (serverless)
- **Engine**: Anthropic Claude Sonnet 4
- **Packaging**: JSZip
- **Deploy**: Vercel

## Use Case Configurations

The engine includes optimized prompts for:

### 1. Research Library
- Extracts: Concepts, theories, methodologies, findings
- Links: Related research, prerequisites, contradictions
- Best for: Academic papers, research notes, literature reviews

### 2. Course Material  
- Extracts: Learning concepts, examples, definitions
- Links: Prerequisites, build-upon relationships, applications
- Best for: Lecture notes, textbooks, study guides

### 3. Meeting Notes
- Extracts: Decisions, action items, projects, topics
- Links: Related meetings, blockers, assignments
- Best for: Team meetings, project discussions, standups

### 4. Project Documentation
- Extracts: Technical concepts, components, APIs, decisions
- Links: Dependencies, implementations, alternatives
- Best for: Architecture docs, technical specs, READMEs

## Cost Estimates

Using Claude Sonnet 4 via API:
- Small corpus (5-10 files, ~50KB): ~$0.10-0.50
- Medium corpus (20-50 files, ~200KB): ~$1-3
- Large corpus (100+ files, ~1MB): ~$5-15

Costs scale with:
- Number of files
- File sizes
- Number of concepts extracted
- Complexity of relationships

## Troubleshooting

**"ANTHROPIC_API_KEY not configured"**
- Make sure `.env.local` exists with your API key
- Restart the dev server after adding the key

**Processing takes too long**
- Normal for large files (each file requires multiple AI calls)
- 10 files typically takes 30-60 seconds
- Check console logs for progress

**ZIP file is small/incomplete**
- Check the browser console for errors
- Verify API key has sufficient credits
- Try with fewer/smaller files first

## License

MIT
