import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  AUTH_SECRET: z.string().min(1),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  AUTHORIZED_GOOGLE_SUB: z
    .string({ error: "is missing" })
    .transform((v) => v.trim().replace(/^["']|["']$/g, ""))
    .pipe(
      z
        .string()
        .refine((v) => !v.includes("@"), "looks like an email — it must be the numeric Google account id (sub)")
        .refine((v) => /^\d+$/.test(v), "must be the numeric Google account id (sub)"),
    ),
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
      // Names and reasons only — never echo values.
      const problems = parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ");
      throw new Error(`Invalid server environment: ${problems}`);
    }
    cached = parsed.data;
  }
  return cached;
}
