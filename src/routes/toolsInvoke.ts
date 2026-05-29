// src/routes/toolsInvoke.ts
import { Request, Response } from 'express';
import { mcpTools } from '../mcp/tools';
import SPPClient from '../clients/SPPClient';

/**
 * POST /tools/:toolName
 * Calls an MCP tool by name. Input schema is enforced by tool, not here.
 */
export default async function toolsInvokeHandler(req: Request, res: Response) {
  const { toolName } = req.params;
  const tool = mcpTools.find(t => t.name === toolName);
  if (!tool) {
    return res.status(404).json({ error: `No such tool: ${toolName}` });
  }
  try {
    const ctx = { sppClient: new SPPClient({}) };
    // All tools take input object and ctx
    const result = await tool.handler(req.body || {}, ctx);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
}
