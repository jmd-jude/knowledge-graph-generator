import Anthropic from '@anthropic-ai/sdk';

// ============================================
// PROMPT TEMPLATES
// ============================================

interface UseCaseConfig {
  systemPrompt: string;
  extractionPrompt: (content: string) => string;
  linkingPrompt: (concepts: Array<string>, content: string) => string;
  relationshipTypes: string[];
}

const USE_CASE_CONFIGS: Record<string, UseCaseConfig> = {
  'research-library': {
    systemPrompt: `You are an expert knowledge graph architect specializing in academic research organization. Your goal is to identify key concepts, theories, methodologies, and connections across research materials to create an interconnected web of knowledge.

Focus on:
- Core concepts and theories
- Methodologies and frameworks
- Key findings and conclusions
- Relationships between ideas
- Prerequisites and dependencies
- Contradictions or debates
- Related research areas`,

    extractionPrompt: (content: string) => `
Analyze this research content and extract the key concepts that should become nodes in a knowledge graph.

CONTENT:
${content}

For each concept, provide:
1. The concept name (2-5 words, title case)
2. A brief description (1-2 sentences)
3. Why it's significant in this content

Return as JSON array:
[
  {
    "name": "Concept Name",
    "description": "Brief description",
    "significance": "Why it matters"
  }
]

CRITICAL: Output ONLY valid JSON, no other text.`,

    linkingPrompt: (concepts: string[], content: string) => `
You are creating an interconnected knowledge graph. Given these concepts and the original content, rewrite the content with wikilinks.

CONCEPTS TO LINK:
${concepts.map(c => `- [[${c}]]`).join('\n')}

ORIGINAL CONTENT:
${content}

INSTRUCTIONS:
1. Add wikilinks [[Like This]] whenever you mention one of the concepts
2. Only link concepts from the list above
3. Link the FIRST occurrence in each section/paragraph
4. Maintain the original structure and flow
5. Don't force links - only where natural
6. Keep all original information

Return the content with wikilinks added. Do not wrap in markdown code blocks.`,

    relationshipTypes: [
      'builds-upon',
      'contradicts',
      'supports',
      'prerequisite-for',
      'related-to',
      'example-of',
      'methodology-for'
    ]
  },

  'course-material': {
    systemPrompt: `You are an expert educational content organizer. Your goal is to create a learning-optimized knowledge graph that shows how concepts build upon each other, highlights prerequisites, and creates clear learning paths.

Focus on:
- Foundational concepts vs advanced topics
- Prerequisites and dependencies
- Examples and applications
- Common misconceptions
- Practice opportunities
- Real-world applications`,

    extractionPrompt: (content: string) => `
Analyze this educational content and extract the key learning concepts.

CONTENT:
${content}

For each concept, provide:
1. The concept name (2-5 words, title case)
2. A brief definition (1-2 sentences)
3. Difficulty level (beginner/intermediate/advanced)
4. Prerequisites (if any)

Return as JSON array:
[
  {
    "name": "Concept Name",
    "description": "Brief definition",
    "level": "beginner|intermediate|advanced",
    "prerequisites": ["Concept1", "Concept2"]
  }
]

CRITICAL: Output ONLY valid JSON, no other text.`,

    linkingPrompt: (concepts: string[], content: string) => `
You are creating a learning-focused knowledge graph. Add wikilinks to show how concepts connect.

CONCEPTS TO LINK:
${concepts.map(c => `- [[${c}]]`).join('\n')}

ORIGINAL CONTENT:
${content}

INSTRUCTIONS:
1. Add wikilinks [[Like This]] for each concept
2. Emphasize prerequisite relationships (e.g., "To understand [[Advanced Topic]], first learn [[Basic Concept]]")
3. Link examples to the concepts they illustrate
4. Maintain pedagogical flow
5. Add "See also:" sections if helpful

Return the content with wikilinks added.`,

    relationshipTypes: [
      'prerequisite-for',
      'builds-upon',
      'example-of',
      'applies-to',
      'related-to'
    ]
  },

  'meeting-notes': {
    systemPrompt: `You are an expert at organizing business communications and project documentation. Your goal is to create a knowledge graph that connects decisions, action items, projects, people, and topics across meetings.

Focus on:
- Key decisions made
- Action items and owners
- Project references
- Recurring topics
- People and roles
- Blockers and dependencies`,

    extractionPrompt: (content: string) => `
Analyze these meeting notes and extract key entities for a knowledge graph.

CONTENT:
${content}

Extract:
1. Projects/initiatives mentioned
2. Key decisions
3. Action items
4. Topics discussed
5. People mentioned (use roles, not names)

Return as JSON array:
[
  {
    "name": "Entity Name",
    "type": "project|decision|action|topic|person",
    "description": "Brief context"
  }
]

CRITICAL: Output ONLY valid JSON, no other text.`,

    linkingPrompt: (concepts: string[], content: string) => `
Create an interconnected meeting notes document with wikilinks.

ENTITIES TO LINK:
${concepts.map(c => `- [[${c}]]`).join('\n')}

ORIGINAL CONTENT:
${content}

INSTRUCTIONS:
1. Add wikilinks for projects, decisions, action items, and topics
2. Help readers navigate between related meetings
3. Maintain chronological flow
4. Keep all original information

Return the content with wikilinks added.`,

    relationshipTypes: [
      'relates-to',
      'blocks',
      'decided-in',
      'action-for',
      'discussed-in'
    ]
  },

  'project-docs': {
    systemPrompt: `You are an expert at organizing technical documentation and project knowledge. Your goal is to create a knowledge graph that connects architecture decisions, technical concepts, dependencies, and implementation details.

Focus on:
- Technical concepts and patterns
- Architecture decisions
- System dependencies
- API endpoints and interfaces
- Implementation details
- Technical debt and decisions`,

    extractionPrompt: (content: string) => `
Analyze this technical documentation and extract key technical concepts.

CONTENT:
${content}

Extract:
1. Technical concepts/patterns
2. System components
3. Dependencies
4. API/interfaces
5. Architecture decisions

Return as JSON array:
[
  {
    "name": "Concept Name",
    "type": "concept|component|dependency|api|decision",
    "description": "Technical description"
  }
]

CRITICAL: Output ONLY valid JSON, no other text.`,

    linkingPrompt: (concepts: string[], content: string) => `
Create interconnected technical documentation with wikilinks.

TECHNICAL ENTITIES TO LINK:
${concepts.map(c => `- [[${c}]]`).join('\n')}

ORIGINAL CONTENT:
${content}

INSTRUCTIONS:
1. Link technical concepts, components, and dependencies
2. Show architectural relationships
3. Connect related implementations
4. Maintain technical accuracy

Return the content with wikilinks added.`,

    relationshipTypes: [
      'depends-on',
      'implements',
      'relates-to',
      'decided-by',
      'alternative-to'
    ]
  }
};

// ============================================
// ENGINE CORE
// ============================================

export interface ProcessingOptions {
  useCase: string;
  files: Array<{ name: string; content: string }>;
  apiKey: string;
}

export interface ProcessedOutput {
  files: Array<{
    name: string;
    content: string;
  }>;
  concepts: Array<{
    name: string;
    description: string;
    sourceFiles: string[];
  }>;
  metadata: {
    totalConcepts: number;
    totalLinks: number;
    processingTime: number;
  };
}

export class KnowledgeGraphEngine {
  private anthropic: Anthropic;
  private config: UseCaseConfig;

  constructor(apiKey: string, useCase: string) {
    this.anthropic = new Anthropic({ apiKey });
    this.config = USE_CASE_CONFIGS[useCase] || USE_CASE_CONFIGS['research-library'];
  }

  async process(files: Array<{ name: string; content: string }>): Promise<ProcessedOutput> {
    const startTime = Date.now();
    
    console.log(`🚀 Starting knowledge graph generation for ${files.length} files`);

    // Step 1: Extract concepts from all files
    console.log('📊 Step 1: Extracting concepts...');
    const allConcepts = await this.extractConceptsFromFiles(files);
    
    // Step 2: Deduplicate and merge similar concepts
    console.log('🔗 Step 2: Deduplicating concepts...');
    const uniqueConcepts = this.deduplicateConcepts(allConcepts);
    
    // Step 3: Add wikilinks to each file
    console.log('✍️  Step 3: Adding wikilinks...');
    const linkedFiles = await this.addWikilinksToFiles(files, uniqueConcepts);
    
    // Step 4: Generate concept index file
    console.log('📚 Step 4: Generating concept index...');
    const indexFile = this.generateConceptIndex(uniqueConcepts);
    
    // Step 5: Count total links
    const totalLinks = this.countWikilinks(linkedFiles);

    const processingTime = Date.now() - startTime;
    console.log(`✅ Complete! Generated ${uniqueConcepts.length} concepts with ${totalLinks} links in ${processingTime}ms`);

    return {
      files: [...linkedFiles, indexFile],
      concepts: uniqueConcepts,
      metadata: {
        totalConcepts: uniqueConcepts.length,
        totalLinks,
        processingTime
      }
    };
  }

  private async extractConceptsFromFiles(
    files: Array<{ name: string; content: string }>
  ): Promise<Array<{ name: string; description: string; sourceFiles: string[] }>> {
    const allConcepts: Array<{ name: string; description: string; sourceFiles: string[] }> = [];

    for (const file of files) {
      console.log(`  Extracting from: ${file.name}`);
      
      const prompt = this.config.extractionPrompt(file.content);
      
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: this.config.systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const responseText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      try {
        // Strip markdown code blocks if present
        const cleanedResponse = responseText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();

        const concepts = JSON.parse(cleanedResponse);
        
        for (const concept of concepts) {
          allConcepts.push({
            name: concept.name,
            description: concept.description || concept.significance || 'No description',
            sourceFiles: [file.name]
          });
        }
      } catch (error) {
        console.error(`Failed to parse concepts from ${file.name}:`, error);
        console.error('Response was:', responseText);
      }
    }

    return allConcepts;
  }

  private deduplicateConcepts(
    concepts: Array<{ name: string; description: string; sourceFiles: string[] }>
  ): Array<{ name: string; description: string; sourceFiles: string[] }> {
    const conceptMap = new Map<string, { name: string; description: string; sourceFiles: string[] }>();

    for (const concept of concepts) {
      const normalizedName = concept.name.toLowerCase().trim();
      
      if (conceptMap.has(normalizedName)) {
        // Merge source files
        const existing = conceptMap.get(normalizedName)!;
        existing.sourceFiles = [...new Set([...existing.sourceFiles, ...concept.sourceFiles])];
        // Keep the longer description
        if (concept.description.length > existing.description.length) {
          existing.description = concept.description;
        }
      } else {
        conceptMap.set(normalizedName, { ...concept });
      }
    }

    return Array.from(conceptMap.values());
  }

  private async addWikilinksToFiles(
    files: Array<{ name: string; content: string }>,
    concepts: Array<{ name: string; description: string; sourceFiles: string[] }>
  ): Promise<Array<{ name: string; content: string }>> {
    const conceptNames = concepts.map(c => c.name);
    const linkedFiles: Array<{ name: string; content: string }> = [];

    for (const file of files) {
      console.log(`  Linking: ${file.name}`);
      
      const prompt = this.config.linkingPrompt(conceptNames, file.content);
      
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: this.config.systemPrompt,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const linkedContent = message.content[0].type === 'text' 
        ? message.content[0].text 
        : file.content;

      linkedFiles.push({
        name: file.name,
        content: linkedContent
      });
    }

    return linkedFiles;
  }

  private generateConceptIndex(
    concepts: Array<{ name: string; description: string; sourceFiles: string[] }>
  ): { name: string; content: string } {
    let indexContent = `# Concept Index

This knowledge graph contains ${concepts.length} interconnected concepts.

## All Concepts

`;

    // Sort concepts alphabetically
    const sortedConcepts = [...concepts].sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    for (const concept of sortedConcepts) {
      indexContent += `### [[${concept.name}]]\n\n`;
      indexContent += `${concept.description}\n\n`;
      indexContent += `*Found in: ${concept.sourceFiles.join(', ')}*\n\n`;
      indexContent += `---\n\n`;
    }

    indexContent += `\n## Source Files\n\n`;
    
    // Get unique source files
    const allSourceFiles = [...new Set(concepts.flatMap(c => c.sourceFiles))];
    for (const file of allSourceFiles) {
      const relatedConcepts = concepts.filter(c => c.sourceFiles.includes(file));
      indexContent += `- **${file}**: ${relatedConcepts.length} concepts\n`;
    }

    return {
      name: '00-INDEX.md',
      content: indexContent
    };
  }

  private countWikilinks(files: Array<{ name: string; content: string }>): number {
    let count = 0;
    const wikilinkRegex = /\[\[([^\]]+)\]\]/g;
    
    for (const file of files) {
      const matches = file.content.match(wikilinkRegex);
      if (matches) {
        count += matches.length;
      }
    }
    
    return count;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export async function generateKnowledgeGraph(
  options: ProcessingOptions
): Promise<ProcessedOutput> {
  const engine = new KnowledgeGraphEngine(options.apiKey, options.useCase);
  return await engine.process(options.files);
}
