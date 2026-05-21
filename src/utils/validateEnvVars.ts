/**
 * Validates that critical environment variables are set and non-empty.
 * Throws an Error and logs guidance if any are missing.
 *
 * If a missing env var is detected, startup will abort with a clear message.
 */
export function validateEnvVars(requiredVars: string[]) {
  const missing = requiredVars.filter((key) => !process.env[key] || process.env[key]?.trim() === "");
  if (missing.length) {
    // Log clear error and abort startup
    // eslint-disable-next-line no-console
    console.error(`\n[CONFIG ERROR] Missing required environment variables: ${missing.join(', ')}`);
    console.error(`[CONFIG ERROR] Please set these in your .env, deployment config, or host settings.`);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
