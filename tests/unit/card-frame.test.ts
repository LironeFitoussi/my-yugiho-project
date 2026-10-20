import { describe, expect, it } from "vitest";

import { frameClass, frameInfo } from "@/lib/card-frame";

describe("card frame", () => {
  it("prefers frameType and detects pendulum", () => {
    expect(frameInfo("xyz_pendulum", "Pendulum Effect Monster")).toEqual({ kind: "xyz", pendulum: true });
    expect(frameClass("effect_pendulum")).toContain("to-teal-500");
  });

  it("derives the frame from the type string when frameType is missing", () => {
    expect(frameInfo(null, "Spell Card").kind).toBe("spell");
    expect(frameInfo(null, "Trap Card").kind).toBe("trap");
    expect(frameInfo(null, "Fusion Monster").kind).toBe("fusion");
    expect(frameInfo(null, "Synchro Tuner Monster").kind).toBe("synchro");
    expect(frameInfo(null, "Normal Tuner Monster").kind).toBe("normal");
    expect(frameInfo(null, "Link Monster").kind).toBe("link");
    expect(frameInfo(null, "Flip Effect Monster").kind).toBe("effect");
    expect(frameInfo(null, "Token").kind).toBe("token");
    expect(frameInfo(null, "").kind).toBe("unknown");
  });
});
