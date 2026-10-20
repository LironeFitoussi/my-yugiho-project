import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  AUTH_SECRET: z.string().min(1),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  AUTHORIZED_GOOGLE_SUB: z.string().regex(/^\d+$/, "must be a numeric Google subject id"),
  AWS_REGION: z.string().min(1).default("eu-central-1"),
  DYNAMODB_TABLE: z.string().min(1).default("yugioh-collection"),
  DYNAMODB_ENDPOINT: z.url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Validated server-only environment. Throws on first use if misconfigured. */
export function serverEnv(): ServerEnv {
  if (!cached) {
    const parsed = serverEnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const keys = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Invalid server environment: ${keys}`);
    }
    cached = parsed.data;
  }
  return cached;
}
