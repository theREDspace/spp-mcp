// src/routes/toolsDescribe.ts
import { Request, Response } from 'express';
import { mcpTools } from '../mcp/tools';
import { boSchemaRegistry } from '../services/boSchemaRegistry';
import { semanticPatterns } from '../services/semanticPatternsRegistry';

/**
 * GET /tools/describe
 * Out-of-band registry for agents/LLMs:
 *   - Available tools (name, desc, input schema)
 *   - Business objects (fields, relationships)
 *   - Hardcoded semantic LLM intent patterns
 */
export default function toolsDescribeHandler(_req: Request, res: Response) {
  const tools = mcpTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    // Zod: serialize just as stringified shape for now
    schema: tool.inputSchema ? tool.inputSchema.toString() : undefined
  }));
  const objects = Object.entries(boSchemaRegistry).map(([name, schema]) => ({
    name, ...schema
  }));
  res.json({ tools, objects, semantic_patterns: semanticPatterns });
}
