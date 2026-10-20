import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const OWNER_SUB = "109876543210987654321";

const auth = vi.fn();
vi.mock("@/lib/auth/config", () => ({
  auth: () => auth(),
  isAuthorizedSub: (sub: unknown) => typeof sub === "string" && sub === OWNER_SUB,
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}
const redirect = vi.fn((url: string) => {
  throw new RedirectSignal(url);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("next/server", () => ({ connection: async () => {} }));
// Disable request memoization so each test sees its own session.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <T,>(fn: T) => fn,
}));

const { requireOwner, ownerOrUnauthorized, getOwner } = await import("@/lib/auth");

const ownerSession = {
  user: { id: OWNER_SUB, name: "Owner", email: "owner@example.com", image: "https://example.com/a.png" },
  expires: "2026-11-19T00:00:00.000Z",
};
const otherSession = { ...ownerSession, user: { ...ownerSession.user, id: "111111111111111111111" } };

beforeEach(() => {
  auth.mockReset();
  redirect.mockClear();
});
afterEach(() => {
  vi.clearAllMocks();
});

describe("requireOwner (pages and server actions)", () => {
  it("returns the owner for the authorized sub", async () => {
    auth.mockResolvedValue(ownerSession);
    await expect(requireOwner()).resolves.toEqual({
      sub: OWNER_SUB,
      name: "Owner",
      email: "owner@example.com",
      image: "https://example.com/a.png",
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to /login when there is no session", async () => {
    auth.mockResolvedValue(null);
    await expect(requireOwner()).rejects.toBeInstanceOf(RedirectSignal);
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login for a session belonging to another Google sub", async () => {
    auth.mockResolvedValue(otherSession);
    await expect(requireOwner()).rejects.toBeInstanceOf(RedirectSignal);
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when the session has no user id", async () => {
    auth.mockResolvedValue({ user: { name: "Owner" }, expires: ownerSession.expires });
    await expect(requireOwner()).rejects.toBeInstanceOf(RedirectSignal);
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("re-checks the session on every call instead of trusting a previous result", async () => {
    auth.mockResolvedValueOnce(ownerSession).mockResolvedValueOnce(otherSession);
    await expect(requireOwner()).resolves.toMatchObject({ sub: OWNER_SUB });
    await expect(requireOwner()).rejects.toBeInstanceOf(RedirectSignal);
    expect(auth).toHaveBeenCalledTimes(2);
  });
});

describe("ownerOrUnauthorized (route handlers)", () => {
  it("returns the owner for the authorized sub", async () => {
    auth.mockResolvedValue(ownerSession);
    const result = await ownerOrUnauthorized();
    expect(result).not.toBeInstanceOf(Response);
    expect(result).toMatchObject({ sub: OWNER_SUB });
  });

  it("returns a 401 Response without redirecting when unauthenticated", async () => {
    auth.mockResolvedValue(null);
    const result = await ownerOrUnauthorized();
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns a 401 Response for another Google sub", async () => {
    auth.mockResolvedValue(otherSession);
    const result = await ownerOrUnauthorized();
    expect((result as Response).status).toBe(401);
    expect(await (result as Response).text()).toBe("");
  });
});

describe("getOwner", () => {
  it("maps missing profile fields to null", async () => {
    auth.mockResolvedValue({ user: { id: OWNER_SUB }, expires: ownerSession.expires });
    await expect(getOwner()).resolves.toEqual({ sub: OWNER_SUB, name: null, email: null, image: null });
  });
});
