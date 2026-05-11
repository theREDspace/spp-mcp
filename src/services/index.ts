// src/services/index.ts
// This file serves as the public entry point for the service layer.
// It re-exports the service factory and any other service utilities.
// Use this file to import service creation logic throughout your app.

export { BOService, type CreateUserOptions } from "./BOService";
export {type BORecordMap } from "./BORecordMap";