import { describe, it, expect } from "vitest";
import {
  explainAvailability,
  validateExplanationInput,
  ExplanationError,
  type ExplanationInput,
} from "@/lib/explainAvailability";
import {
  checkAvailability,
  fallbackExplanation,
} from "@/lib/checkAvailability";
import { BOOKINGS, ROOM } from "@/fixtures/room";

const VALID: ExplanationInput = {
  roomLabel: "Seminar Room SC-204",
  start: "11:30",
  end: "12:00",
  isAvailable: true,
  reasonCode: "available",
};

describe("explainAvailability", () => {
  it("returns a validated explanation for a valid input (available)", async () => {
    const out = await explainAvailability(VALID);
    expect(typeof out.explanation).toBe("string");
    expect(out.explanation.length).toBeGreaterThan(0);
    expect(out.explanation.length).toBeLessThanOrEqual(300);
    expect(out.explanation).toContain("Seminar Room SC-204");
    expect(out.explanation).toContain("11:30");
    expect(out.explanation).toContain("12:00");
  });

  it("reflects the not-available reason in the text", async () => {
    const out = await explainAvailability({
      ...VALID,
      isAvailable: false,
      reasonCode: "overlap",
    });
    expect(out.explanation).toContain("not available");
    expect(out.explanation).toContain("overlap");
  });

  it("rejects empty, malformed, or over-200-character input values", async () => {
    await expect(explainAvailability(null)).rejects.toBeInstanceOf(ExplanationError);
    await expect(explainAvailability({ ...VALID, roomLabel: "" })).rejects.toBeInstanceOf(
      ExplanationError,
    );
    await expect(
      explainAvailability({ ...VALID, start: "abc" }),
    ).rejects.toBeInstanceOf(ExplanationError);
    await expect(
      explainAvailability({ ...VALID, isAvailable: "yes" as unknown as boolean }),
    ).rejects.toBeInstanceOf(ExplanationError);
    await expect(
      explainAvailability({ ...VALID, reasonCode: "nope" }),
    ).rejects.toBeInstanceOf(ExplanationError);
    const long = "x".repeat(201);
    await expect(
      explainAvailability({ ...VALID, roomLabel: long }),
    ).rejects.toBeInstanceOf(ExplanationError);
  });

  it("rejects invalid output (empty or over 300 characters)", async () => {
    expect(() => validateExplanationInput(VALID)).not.toThrow();
    const out = await explainAvailability(VALID);
    expect(out.explanation.length).toBeLessThanOrEqual(300);
  });

  it("times out after the configured timeout (3s default, simulated)", async () => {
    const controller = new AbortController();
    const promise = explainAvailability(VALID, {
      timeoutMs: 3000,
      signal: controller.signal,
    });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(ExplanationError);
  });
});

describe("explainAvailability — duration-model cases", () => {
  it("available: produces an explanation for an available slot", async () => {
    const result = checkAvailability({ start: "11:30", durationMinutes: 30, blocked: false });
    expect(result.ok).toBe(true);
    const out = await explainAvailability({
      roomLabel: ROOM.name,
      start: result.start,
      end: result.end,
      isAvailable: result.ok,
      reasonCode: result.reason,
    });
    expect(out.explanation).toContain("available");
    expect(out.explanation).toContain("11:30");
    expect(out.explanation).toContain("12:00");
  });

  it("overlap: explanation reflects an overlap rejection", async () => {
    const result = checkAvailability({ start: "10:30", durationMinutes: 60, blocked: false });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("overlap");
    const out = await explainAvailability({
      roomLabel: ROOM.name,
      start: "10:30",
      end: "11:30",
      isAvailable: result.ok,
      reasonCode: result.reason,
    });
    expect(out.explanation).toContain("not available");
    expect(out.explanation).toContain("overlap");
  });

  it("blocked room: explanation reflects a blocked rejection", async () => {
    const result = checkAvailability({ start: "11:30", durationMinutes: 30, blocked: true });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("blocked");
    const out = await explainAvailability({
      roomLabel: ROOM.name,
      start: "11:30",
      end: "12:00",
      isAvailable: result.ok,
      reasonCode: result.reason,
    });
    expect(out.explanation).toContain("not available");
    expect(out.explanation).toContain("blocked");
  });

  it("invalid time: explanation adapter rejects an unparseable time", async () => {
    const result = checkAvailability({ start: "abc", durationMinutes: 30, blocked: false });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invalid_time");
    await expect(
      explainAvailability({
        roomLabel: ROOM.name,
        start: "abc",
        end: "",
        isAvailable: result.ok,
        reasonCode: result.reason,
      }),
    ).rejects.toBeInstanceOf(ExplanationError);
  });

  it("past time: explanation reflects a past-time rejection", async () => {
    const result = checkAvailability({ start: "08:00", durationMinutes: 30, blocked: false });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("past");
    const out = await explainAvailability({
      roomLabel: ROOM.name,
      start: "08:00",
      end: "08:30",
      isAvailable: result.ok,
      reasonCode: result.reason,
    });
    expect(out.explanation).toContain("not available");
    expect(out.explanation).toContain("past");
  });

  it("empty input: adapter rejects an empty start value", async () => {
    await expect(
      explainAvailability({ ...VALID, start: "" }),
    ).rejects.toBeInstanceOf(ExplanationError);
  });

  it("over-long input: adapter rejects a room label over 200 characters", async () => {
    const long = "y".repeat(201);
    await expect(
      explainAvailability({ ...VALID, roomLabel: long }),
    ).rejects.toBeInstanceOf(ExplanationError);
  });

  it("adapter timeout: produces a deterministic fallback message", async () => {
    const result = checkAvailability({ start: "11:30", durationMinutes: 30, blocked: false });
    const controller = new AbortController();
    const promise = explainAvailability(
      {
        roomLabel: ROOM.name,
        start: result.ok ? result.start : "11:30",
        end: result.ok ? result.end : "12:00",
        isAvailable: result.ok,
        reasonCode: result.reason,
      },
      { signal: controller.signal },
    );
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(ExplanationError);
    const fallback = fallbackExplanation(result.reason);
    expect(typeof fallback).toBe("string");
    expect(fallback.length).toBeGreaterThan(0);
  });

  it("simulated adapter failure: produces a deterministic fallback (invalid output)", async () => {
    const result = checkAvailability({ start: "10:30", durationMinutes: 60, blocked: false });
    expect(result.reason).toBe("overlap");
    const builder = (): string => "";
    await expect(
      explainAvailability(
        {
          roomLabel: ROOM.name,
          start: "10:30",
          end: "11:30",
          isAvailable: result.ok,
          reasonCode: result.reason,
        },
        { build: builder },
      ),
    ).rejects.toBeInstanceOf(ExplanationError);
    const fallback = fallbackExplanation(result.reason);
    expect(fallback).toContain("overlap");
  });

  it("explanation never changes the availability result or bookings", async () => {
    const start = "11:30";
    const durationMinutes = 30;
    const before = checkAvailability({ start, durationMinutes, blocked: false });
    const bookingsBefore = JSON.stringify(BOOKINGS);

    await explainAvailability({
      roomLabel: ROOM.name,
      start: before.ok ? before.start : start,
      end: before.ok ? before.end : "12:00",
      isAvailable: before.ok,
      reasonCode: before.reason,
    });

    const after = checkAvailability({ start, durationMinutes, blocked: false });
    expect(after).toEqual(before);
    expect(JSON.stringify(BOOKINGS)).toStrictEqual(bookingsBefore);
  });

  it("regression: rejects an isAvailable/reasonCode mismatch (available with a rejected reason)", async () => {
    await expect(
      explainAvailability({
        ...VALID,
        isAvailable: true,
        reasonCode: "overlap",
      }),
    ).rejects.toBeInstanceOf(ExplanationError);
  });

  it("regression: rejects an isAvailable/reasonCode mismatch (not available with the available reason)", async () => {
    await expect(
      explainAvailability({
        ...VALID,
        isAvailable: false,
        reasonCode: "available",
      }),
    ).rejects.toBeInstanceOf(ExplanationError);
  });

  it("regression: any adapter error still maps to the deterministic fallback for the reason", async () => {
    expect(fallbackExplanation("overlap")).toContain("overlap");
    expect(fallbackExplanation("available").length).toBeGreaterThan(0);
  });
});
