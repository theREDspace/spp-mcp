import { ZodTypeAny } from 'zod';

export type ToolResponse = {
  content: { type: 'text'; text: string }[];
};

export type ToolHandler = (args: any, ctx: any) => Promise<ToolResponse>;

export type Tool = {
  name: string;
  description: string;
  inputSchema: ZodTypeAny;
  handler: ToolHandler;
};
