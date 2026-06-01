import { ZodTypeAny } from 'zod';

export type ToolResponse = {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export type ToolHandler = (args: any, ctx: any) => Promise<ToolResponse>;

export type Tool = {
  name: string;
  description: string;
  inputSchema: ZodTypeAny;
  /** Optional structured output schema (MCP 2025-06-18). When provided, clients
   *  can rely on `structuredContent` matching this shape. */
  outputSchema?: ZodTypeAny;
  handler: ToolHandler;
};
