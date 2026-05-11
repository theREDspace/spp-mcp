# Suite Projects Pro MCP Server

A basic Node.js & TypeScript Express server for handling Suite Projects Pro callbacks and health checks.

## Features
- **GET /health**: Health check endpoint (returns `{ status: "ok" }`)
- **POST /callback/spp**: Receives and logs JSON payloads from SPP sandbox

## Getting Started

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start in development mode:
   ```sh
   npm run dev
   ```
3. Build and run production:
   ```sh
   npm run build
   npm start
   ```

- Server listens on port `3030`.
- Edit API routes in `src/index.ts`
