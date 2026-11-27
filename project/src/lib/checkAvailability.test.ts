import { describe, it, expect } from "vitest";
import { checkAvailability } from "@/lib/checkAvailability";
import { BOOKINGS } from "@/fixtures/room";

const run = (start: string, durationMinutes: number, blocked = false) =>
  checkAvailability({ start, durationMinutes, blocked });

describe("checkAvailability — duration-based model", () => {
  it("T1: 11:30 / 30 min is available", () => {
    const r = run("11:30", 30);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.start).toBe("11:30");
      expect(r.end).toBe("12:00");
      expect(r.reason).toBe("available");
    }
  });

  it("T2: 10:30 / 60 min overlaps an existing booking", () => {
    const r = run("10:30", 60);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("overlap");
  });

  it("T3: 11:30 / 30 min with room blocked is unavailable", () => {
    const r = run("11:30", 30, true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("blocked");
  });

  it("T4: duration 0 is an invalid duration error", () => {
    const r = run("11:30", 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid_duration");
  });

  it("T5: duration 121 is an invalid duration error", () => {
    const r = run("11:30", 121);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid_duration");
  });

  it("T6: start 08:00 is in the past", () => {
    const r = run("08:00", 30);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("past");
  });

  it("T7: 12:00 / 60 min is available (ends at 13:00, touches booking)", () => {
    const r = run("12:00", 60);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.start).toBe("12:00");
      expect(r.end).toBe("13:00");
    }
  });

  it("T8: bookings are unchanged after checks", () => {
    const snapshot = JSON.stringify(BOOKINGS);
    run("11:30", 30);
    run("10:30", 60);
    run("11:30", 30, true);
    run("11:30", 0);
    run("08:00", 30);
    expect(JSON.stringify(BOOKINGS)).toStrictEqual(snapshot);
    expect(BOOKINGS).toHaveLength(2);
  });
});

describe("checkAvailability — additional rule cases", () => {
  it("rejects an unparseable start time (AC6)", () => {
    const r = run("abc", 30);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid_time");
  });

  it("rejects a non-number duration (AC6)", () => {
    const r = run("11:30", Number("abc"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid_duration");
  });

  it("accepts the earliest allowed start (09:00 / 60)", () => {
    const r = run("09:00", 60);
    expect(r.ok).toBe(true);
  });

  it("accepts a slot ending exactly when the 10:00 booking starts (09:00 / 60)", () => {
    const r = run("09:00", 60);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.end).toBe("10:00");
  });

  it("accepts a slot starting exactly when the 14:00 booking ends (14:00 / 30)", () => {
    const r = run("14:00", 30);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.end).toBe("14:30");
  });

  it("rejects a slot overlapping the 13:00-14:00 booking (13:30 / 30)", () => {
    const r = run("13:30", 30);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("overlap");
  });

  it("carries a non-empty message for both outcomes (AC5/AC6)", () => {
    const ok = run("11:30", 30);
    const rejected = run("10:30", 60);
    expect(typeof ok.message === "string" && ok.message.length > 0).toBe(true);
    expect(typeof rejected.message === "string" && rejected.message.length > 0).toBe(true);
  });

  it("120 minutes is allowed; 121 is not (boundary)", () => {
    expect(run("14:00", 120).ok).toBe(true);
    expect(run("14:00", 121).ok).toBe(false);
  });
});
