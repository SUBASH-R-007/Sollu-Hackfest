import { describe, expect, it } from "vitest";
import {
  addWithdrawals,
  isConsentWithdrawn,
  parseWithdrawals,
} from "./withdrawals";

describe("voice consent withdrawal record (I-7)", () => {
  it("starts empty and ignores malformed stored values", () => {
    expect(parseWithdrawals(undefined)).toEqual({
      ids: new Set(),
      latestAt: null,
    });
    const parsed = parseWithdrawals({ ids: ["a", 3, "", null], latestAt: -1 });
    expect([...parsed.ids]).toEqual(["a"]);
    expect(parsed.latestAt).toBeNull();
  });

  it("accumulates withdrawn IDs and keeps the latest withdrawal time", () => {
    const first = parseWithdrawals(
      addWithdrawals(parseWithdrawals(undefined), ["c1"], 5000),
    );
    const second = parseWithdrawals(addWithdrawals(first, ["c2", "c1"], 3000));
    expect([...second.ids]).toEqual(["c1", "c2"]);
    expect(second.latestAt).toBe(5000);
  });

  it("blocks withdrawn consents and older consents from backups, but not newer fresh consent", () => {
    const withdrawals = parseWithdrawals({ ids: ["old"], latestAt: 5000 });
    expect(isConsentWithdrawn({ id: "old", at: 9000 }, withdrawals)).toBe(true);
    expect(
      isConsentWithdrawn({ id: "other-device", at: 4000 }, withdrawals),
    ).toBe(true);
    expect(isConsentWithdrawn({ id: "no-time" }, withdrawals)).toBe(true);
    expect(isConsentWithdrawn({ id: "fresh", at: 6000 }, withdrawals)).toBe(
      false,
    );
    expect(
      isConsentWithdrawn({ id: "any", at: 1 }, parseWithdrawals(undefined)),
    ).toBe(false);
  });
});
