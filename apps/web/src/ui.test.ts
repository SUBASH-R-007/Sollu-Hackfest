import { describe, expect, it } from "vitest";
import { releaseActivates, RELEASE_SLOP_PX } from "./ui";

const box = { left: 100, top: 100, right: 220, bottom: 220 };
const release = (
  patch: Partial<Parameters<typeof releaseActivates>[1]> = {},
) => ({
  pointerId: 7,
  button: 0,
  clientX: 160,
  clientY: 160,
  ...patch,
});

describe("TapButton pointer release", () => {
  it("activates when the same pointer pressed and released on the button", () => {
    expect(releaseActivates(7, release(), box)).toBe(true);
  });

  it("ignores a release when the press started on another element", () => {
    expect(releaseActivates(null, release(), box)).toBe(false);
  });

  it("ignores a release from a different pointer", () => {
    expect(releaseActivates(3, release(), box)).toBe(false);
  });

  it("ignores non-primary buttons", () => {
    expect(releaseActivates(7, release({ button: 2 }), box)).toBe(false);
  });

  it("forgives a small tremor just outside the edge", () => {
    expect(
      releaseActivates(
        7,
        release({ clientX: box.right + RELEASE_SLOP_PX }),
        box,
      ),
    ).toBe(true);
  });

  it("does not activate after drifting well away (for example onto Help)", () => {
    expect(
      releaseActivates(
        7,
        release({ clientX: box.right + RELEASE_SLOP_PX + 40 }),
        box,
      ),
    ).toBe(false);
    expect(releaseActivates(7, release({ clientY: box.top - 80 }), box)).toBe(
      false,
    );
  });
});
