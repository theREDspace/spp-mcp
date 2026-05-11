// Expose /mcp endpoint using official MCP v2 Express app
import { initializeMcpTransport } from '../mcp/transport';

// Export a function that returns the configured MCP Express app
// This must be called during app setup to properly initialize the transport
export default initializeMcpTransport;
