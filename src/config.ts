/**
 * Validated, frozen configuration loaded once at startup.
 *
 * Reading process.env scattered across the codebase makes it impossible to
 * see at a glance what the server depends on, and silently coerces missing
 * values to `undefined` deep in request handlers. This module reads, validates,
 * and freezes the config exactly once; downstream code should import { config }.
 *
 * Calling load() a second time is a no-op. validateEnvVars() in startup remains
 * for back-compat but should be considered redundant.
 */
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3030),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // SPP credentials
  SPP_URL: z.string().url(),
  SPP_CLIENT_ID: z.string().min(1),
  SPP_CLIENT_SECRET: z.string().min(1),
  SPP_CALLBACK_URL: z.string().url(),
  SPP_NAMESPACE: z.string().min(1),
  SPP_KEY: z.string().min(1),

  // Optional fallback when /callback/spp loses the state mapping (e.g. process restart).
  SPP_FORWARD_CALLBACK_URL: z.string().url().optional(),

  // Public base URL used in /.well-known metadata.
  APP_BASE_URL: z.string().url().optional(),

  // OAuth proxy
  REGISTRATION_SECRET: z.string().min(8).optional(),
  CLIENT_REGISTRY_PATH: z.string().default('data/clients.json'),
  OAUTH_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(30),

  // HTTP
  CORS_ORIGINS: z.string().optional(), // comma-separated
  TRUST_PROXY: z.string().optional(),  // 'true', 'loopback', '1', a hop count, etc.
});

export type AppConfig = z.infer<typeof schema>;

let cached: Readonly<AppConfig> | null = null;

export function load(): Readonly<AppConfig> {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  cached = Object.freeze(parsed.data);
  return cached;
}

/** Reset cache; intended for tests only. */
export function _resetForTests(): void {
  cached = null;
}
