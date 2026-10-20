import { describe, expect, it } from "vitest";

import { decodeCursor, encodeCursor } from "@/lib/aws/pagination";

const OWNER = { attr: "PK", value: "USER#OWNER" } as const;
const lastKey = { PK: "USER#OWNER", SK: "CARD#46986414#COPY#3f1c2a7e-0d4b-4c1e-9a52-6b7d8e9f0a12" };

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");

describe("cursor pagination", () => {
  it("round-trips a LastEvaluatedKey through an opaque cursor", () => {
    const cursor = encodeCursor(lastKey);
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeCursor(cursor, OWNER)).toEqual(lastKey);
  });

  it("round-trips GSI keys with numeric attributes", () => {
    const gsiKey = { PK: "USER#OWNER", SK: "PURCHASE#p1", GSI1PK: "USER#OWNER#PURCHASES", GSI1SK: "DATE#2026-10-01#p1", n: 3 };
    expect(decodeCursor(encodeCursor(gsiKey), { attr: "GSI1PK", value: "USER#OWNER#PURCHASES" })).toEqual(gsiKey);
  });

  it("returns null for the last page", () => {
    expect(encodeCursor(undefined)).toBeNull();
  });

  it("treats missing cursors as the first page", () => {
    expect(decodeCursor(undefined, OWNER)).toBeUndefined();
    expect(decodeCursor(null, OWNER)).toBeUndefined();
    expect(decodeCursor("", OWNER)).toBeUndefined();
  });

  it("rejects a cursor tampered to point at another partition", () => {
    const tampered = encodeCursor({ PK: "CATALOG#CARD", SK: "ID#46986414" });
    expect(decodeCursor(tampered, OWNER)).toBeUndefined();
    const gsiTampered = encodeCursor({ PK: "USER#OWNER", SK: "x", GSI1PK: "USER#OWNER#PRODUCTS", GSI1SK: "y" });
    expect(decodeCursor(gsiTampered, { attr: "GSI1PK", value: "USER#OWNER#PURCHASES" })).toBeUndefined();
  });

  it("rejects a cursor missing the partition attribute", () => {
    expect(decodeCursor(encodeCursor({ SK: "CARD#1#COPY#x" }), OWNER)).toBeUndefined();
  });

  it.each([
    ["non-base64 garbage", "%%%not-a-cursor%%%"],
    ["base64 of non-JSON", b64("not json")],
    ["a JSON array", b64(JSON.stringify(["USER#OWNER"]))],
    ["a JSON string", b64(JSON.stringify("USER#OWNER"))],
    ["nested objects", b64(JSON.stringify({ PK: "USER#OWNER", SK: { S: "x" } }))],
    ["boolean values", b64(JSON.stringify({ PK: "USER#OWNER", SK: true }))],
  ])("rejects %s", (_label, cursor) => {
    expect(decodeCursor(cursor, OWNER)).toBeUndefined();
  });
});
