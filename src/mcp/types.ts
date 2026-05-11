// MCP Types for SPP MCP Server

export interface MCPSigninParams {}
export interface MCPSigninResult {
  auth_url: string;
  note: string;
}

export interface MCPInstructionsResult {
  title: string;
  message: string;
  endpoints: {
    path: string;
    method: string;
    description: string;
  }[];
}

export interface ListProjectsParams {
  access_token: string;
  filter?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface ListBookingsParams {
  access_token: string;
  filter?: Record<string, any>;
  limit?: number;
  offset?: number;
}
