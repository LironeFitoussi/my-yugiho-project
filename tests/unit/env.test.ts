import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SUB = "109876543210987654321";

async function loadEnv(sub: string | undefined) {
  vi.resetModules(); // serverEnv() caches the parsed env in module state
  vi.stubEnv("AUTH_SECRET", "test-secret");
  vi.stubEnv("AUTH_GOOGLE_ID", "test-id");
  vi.stubEnv("AUTH_GOOGLE_SECRET", "test-google-secret");
  vi.stubEnv("AUTHORIZED_GOOGLE_SUB", sub);
  const { serverEnv } = await import("@/lib/env");
  return serverEnv;
}

function errorOf(fn: () => unknown): Error {
  try {
    fn();
  } catch (error) {
    return error as Error;
  }
  throw new Error("expected serverEnv() to throw");
}

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => vi.unstubAllEnvs());

describe("serverEnv AUTHORIZED_GOOGLE_SUB", () => {
  it("accepts a plain numeric sub", async () => {
    const serverEnv = await loadEnv(SUB);
    expect(serverEnv().AUTHORIZED_GOOGLE_SUB).toBe(SUB);
  });

  it.each([
    ["surrounding whitespace", `  ${SUB}\n`],
    ["double quotes", `"${SUB}"`],
    ["single quotes", `'${SUB}'`],
    ["quotes and whitespace", ` "${SUB}" `],
  ])("strips %s", async (_label, raw) => {
    const serverEnv = await loadEnv(raw);
    expect(serverEnv().AUTHORIZED_GOOGLE_SUB).toBe(SUB);
  });

  it("rejects an email address with a hint, without echoing the value", async () => {
    const value = "owner.secret@example.com";
    const serverEnv = await loadEnv(value);
    const error = errorOf(() => serverEnv());
    expect(error.message).toMatch(/AUTHORIZED_GOOGLE_SUB/);
    expect(error.message).toMatch(/email/);
    expect(error.message).not.toContain(value);
    expect(error.message).not.toContain("owner.secret");
  });

  it.each([
    ["letters", "abc123secretvalue"],
    ["a negative number", "-12345"],
    ["a decimal", "1234.5678"],
    ["an empty string", ""],
    ["only quotes", '""'],
    ["an inner space", "1234 5678"],
  ])("rejects %s without echoing the value", async (_label, raw) => {
    const serverEnv = await loadEnv(raw);
    const error = errorOf(() => serverEnv());
    expect(error.message).toMatch(/AUTHORIZED_GOOGLE_SUB/);
    if (raw.length > 2) expect(error.message).not.toContain(raw);
  });

  it("reports a missing sub by name", async () => {
    const serverEnv = await loadEnv(undefined);
    vi.stubEnv("AUTHORIZED_GOOGLE_SUB", undefined);
    const error = errorOf(() => serverEnv());
    expect(error.message).toMatch(/AUTHORIZED_GOOGLE_SUB is missing/);
  });

  it("never echoes other secret values in the error", async () => {
    vi.resetModules();
    vi.stubEnv("AUTH_SECRET", "super-secret-auth-value");
    vi.stubEnv("AUTH_GOOGLE_ID", "");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "super-secret-google-value");
    vi.stubEnv("AUTHORIZED_GOOGLE_SUB", "not-a-sub-value");
    const { serverEnv } = await import("@/lib/env");
    const error = errorOf(() => serverEnv());
    expect(error.message).toMatch(/AUTH_GOOGLE_ID/);
    expect(error.message).not.toContain("super-secret");
    expect(error.message).not.toContain("not-a-sub-value");
  });
});
