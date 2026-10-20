import { z } from "zod";

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const setListParamsSchema = z.object({
  q: z.preprocess(first, z.string().trim().max(100).catch("")).default(""),
  classic: z.preprocess(first, z.string().optional()).transform((v) => v === "1"),
});

export const SET_FILTERS = ["all", "owned", "missing"] as const;
export type SetFilter = (typeof SET_FILTERS)[number];

export const setDetailParamsSchema = z.object({
  show: z.preprocess(first, z.enum(SET_FILTERS).catch("all")).default("all"),
});

/** Set codes are short alphanumeric prefixes like "LOB" or "SDK". */
export const setCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-]{1,16}$/);
