import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Capture the Auth.js config so the signIn callback can be exercised without a real provider.
const nextAuthConfigs: unknown[] = [];
vi.mock("next-auth", () => ({
  default: (config: unknown) => {
    nextAuthConfigs.push(config);
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock("next-auth/providers/google", () => ({ default: { id: "google" } }));

const OWNER_SUB = "109876543210987654321";

function stubValidEnv(sub = OWNER_SUB) {
  vi.stubEnv("AUTH_SECRET", "test-secret");
  vi.stubEnv("AUTH_GOOGLE_ID", "test-id");
  vi.stubEnv("AUTH_GOOGLE_SECRET", "test-google-secret");
  vi.stubEnv("AUTHORIZED_GOOGLE_SUB", sub);
  vi.stubEnv("NODE_ENV", "test");
}

type SignInArgs = { account?: { provider: string } | null; profile?: { sub?: string } };
type CapturedConfig = { callbacks: { signIn: (args: SignInArgs) => boolean } };

beforeEach(() => {
  vi.resetModules(); // serverEnv() caches per module instance
  nextAuthConfigs.length = 0;
  stubValidEnv();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isAuthorizedSub", () => {
  it("accepts only the exact configured Google sub", async () => {
    const { isAuthorizedSub } = await import("@/lib/auth/config");
    expect(isAuthorizedSub(OWNER_SUB)).toBe(true);
  });

  it("rejects a different sub, including prefixes, suffixes and padded variants", async () => {
    const { isAuthorizedSub } = await import("@/lib/auth/config");
    expect(isAuthorizedSub("109876543210987654322")).toBe(false);
    expect(isAuthorizedSub(OWNER_SUB.slice(0, -1))).toBe(false);
    expect(isAuthorizedSub(`${OWNER_SUB}0`)).toBe(false);
    expect(isAuthorizedSub(` ${OWNER_SUB}`)).toBe(false);
    expect(isAuthorizedSub(`${OWNER_SUB} `)).toBe(false);
  });

  it("rejects empty, missing and non-string subs", async () => {
    const { isAuthorizedSub } = await import("@/lib/auth/config");
    expect(isAuthorizedSub("")).toBe(false);
    expect(isAuthorizedSub(undefined)).toBe(false);
    expect(isAuthorizedSub(null)).toBe(false);
    expect(isAuthorizedSub(Number(OWNER_SUB))).toBe(false);
    expect(isAuthorizedSub(BigInt(OWNER_SUB))).toBe(false);
    expect(isAuthorizedSub([OWNER_SUB])).toBe(false);
    expect(isAuthorizedSub({ sub: OWNER_SUB })).toBe(false);
  });

  it("matches the configured sub after quotes/whitespace are stripped from the env value", async () => {
    stubValidEnv(`  "${OWNER_SUB}"  `);
    const { isAuthorizedSub } = await import("@/lib/auth/config");
    expect(isAuthorizedSub(OWNER_SUB)).toBe(true);
    expect(isAuthorizedSub(`"${OWNER_SUB}"`)).toBe(false);
  });
});

describe("Auth.js signIn callback", () => {
  async function signInCallback() {
    await import("@/lib/auth/config");
    return (nextAuthConfigs.at(-1) as CapturedConfig).callbacks.signIn;
  }

  it("allows the authorized Google account", async () => {
    const signIn = await signInCallback();
    expect(signIn({ account: { provider: "google" }, profile: { sub: OWNER_SUB } })).toBe(true);
  });

  it("rejects any other Google account", async () => {
    const signIn = await signInCallback();
    expect(signIn({ account: { provider: "google" }, profile: { sub: "111111111111111111111" } })).toBe(false);
    expect(signIn({ account: { provider: "google" }, profile: {} })).toBe(false);
  });

  it("rejects the owner's sub arriving through a non-Google provider or without an account", async () => {
    const signIn = await signInCallback();
    expect(signIn({ account: { provider: "github" }, profile: { sub: OWNER_SUB } })).toBe(false);
    expect(signIn({ account: null, profile: { sub: OWNER_SUB } })).toBe(false);
  });
});
