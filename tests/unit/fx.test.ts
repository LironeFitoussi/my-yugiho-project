import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("@/lib/aws/client", () => ({
  ddb: () => ({ send }),
  tableName: () => "test-table",
}));

const { loadUsdIlsRate } = await import("@/features/pricing/fx");
const { dateSk, todayUtc } = await import("@/lib/aws/keys");

const fetchMock = vi.fn();

beforeEach(() => {
  send.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const stored = {
  PK: "FX#USD#ILS",
  SK: "DATE#2026-10-18",
  entityType: "FX_RATE",
  base: "USD",
  quote: "ILS",
  rate: "3.1",
  rateDate: "2026-10-17",
  fetchedAt: "2026-10-18T08:00:00.000Z",
  source: "frankfurter (ECB)",
};

const providerOk = () =>
  new Response(JSON.stringify({ date: "2026-10-20", base: "USD", quote: "ILS", rate: 3.1077 }), { status: 200 });

describe("loadUsdIlsRate", () => {
  it("returns today's cached rate without calling the provider", async () => {
    send.mockImplementation(async (cmd: unknown) => {
      if (cmd instanceof GetCommand) return { Item: { ...stored, SK: dateSk(todayUtc()) } };
      throw new Error("unexpected command");
    });
    const rate = await loadUsdIlsRate();
    expect(rate?.rate).toBe("3.1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches from Frankfurter and stores the rate when today's is missing", async () => {
    send.mockImplementation(async (cmd: unknown) => {
      if (cmd instanceof GetCommand) return {};
      if (cmd instanceof PutCommand) return {};
      throw new Error("unexpected command");
    });
    fetchMock.mockResolvedValue(providerOk());

    const rate = await loadUsdIlsRate();
    expect(rate).toMatchObject({ base: "USD", quote: "ILS", rate: "3.1077", rateDate: "2026-10-20", source: "frankfurter (ECB)" });
    expect(typeof rate?.rate).toBe("string");
    expect(String(fetchMock.mock.calls[0][0])).toContain("api.frankfurter.dev/v2/rate/USD/ILS");

    const put = send.mock.calls.map(([c]) => c).find((c) => c instanceof PutCommand) as PutCommand;
    expect(put.input.Item).toMatchObject({
      PK: "FX#USD#ILS",
      SK: dateSk(todayUtc()),
      entityType: "FX_RATE",
      rate: "3.1077",
      rateDate: "2026-10-20",
    });
    expect(put.input.ConditionExpression).toBe("attribute_not_exists(PK)");
  });

  it("falls back to the latest stored rate (with its own fetchedAt) when the provider fails", async () => {
    send.mockImplementation(async (cmd: unknown) => {
      if (cmd instanceof GetCommand) return {};
      if (cmd instanceof QueryCommand) {
        expect(cmd.input.ScanIndexForward).toBe(false);
        expect(cmd.input.Limit).toBe(1);
        return { Items: [stored] };
      }
      throw new Error("unexpected command");
    });
    fetchMock.mockResolvedValue(new Response("oops", { status: 503 }));

    const rate = await loadUsdIlsRate();
    expect(rate).toEqual({
      base: "USD",
      quote: "ILS",
      rate: "3.1",
      rateDate: "2026-10-17",
      fetchedAt: "2026-10-18T08:00:00.000Z",
      source: "frankfurter (ECB)",
    });
  });

  it("treats a malformed provider response as a failure", async () => {
    send.mockImplementation(async (cmd: unknown) => {
      if (cmd instanceof GetCommand) return {};
      if (cmd instanceof QueryCommand) return { Items: [] };
      throw new Error("unexpected command");
    });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ rates: { ILS: "x" } }), { status: 200 }));
    expect(await loadUsdIlsRate()).toBeNull();
  });

  it("returns null when the provider fails and nothing is stored — never invents a rate", async () => {
    send.mockImplementation(async (cmd: unknown) => {
      if (cmd instanceof GetCommand) return {};
      if (cmd instanceof QueryCommand) return { Items: [] };
      throw new Error("unexpected command");
    });
    fetchMock.mockRejectedValue(new TypeError("network down"));
    expect(await loadUsdIlsRate()).toBeNull();
  });
});
