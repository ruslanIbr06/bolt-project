import { CURRENT_TIME, BOOKINGS, type Booking } from "@/fixtures/room";

export type ReasonCode =
  | "invalid_time"
  | "invalid_duration"
  | "past"
  | "blocked"
  | "overlap"
  | "available";

export type CheckResult =
  | { ok: true; message: string; reason: ReasonCode; start: string; end: string }
  | { ok: false; message: string; reason: ReasonCode };

export interface CheckInput {
  start: string; // "HH:MM"
  durationMinutes: number;
  blocked: boolean;
}

const MAX_DURATION_MINUTES = 120;
const MIN_DURATION_MINUTES = 1;
const NOW_LABEL = CURRENT_TIME.slice(11, 16);
const DATE_PREFIX = CURRENT_TIME.slice(0, 10);

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function toDateTime(time: string): Date {
  return new Date(`${DATE_PREFIX}T${time}:00`);
}

function hasOverlap(
  start: Date,
  end: Date,
  bookings: readonly Booking[],
): boolean {
  return bookings.some((b) => start < new Date(b.end) && end > new Date(b.start));
}

function addMinutes(time: string, minutes: number): string {
  const total = toDateTime(time).getTime() + minutes * 60000;
  const d = new Date(total);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function checkAvailability(
  input: CheckInput,
  now: Date = new Date(CURRENT_TIME),
  bookings: readonly Booking[] = BOOKINGS,
): CheckResult {
  const { start, durationMinutes, blocked } = input;

  if (!TIME_PATTERN.test(start) || Number.isNaN(toDateTime(start).getTime())) {
    return {
      ok: false,
      reason: "invalid_time",
      message: "Please enter a valid start time.",
    };
  }

  if (
    typeof durationMinutes !== "number" ||
    Number.isNaN(durationMinutes) ||
    durationMinutes < MIN_DURATION_MINUTES ||
    durationMinutes > MAX_DURATION_MINUTES
  ) {
    return {
      ok: false,
      reason: "invalid_duration",
      message: `Duration must be between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes.`,
    };
  }

  const startDt = toDateTime(start);
  const end = addMinutes(start, durationMinutes);
  const endDt = toDateTime(end);

  if (startDt < now) {
    return {
      ok: false,
      reason: "past",
      message: `Start time is in the past. Requests must start at or after ${NOW_LABEL}.`,
    };
  }

  if (blocked) {
    return {
      ok: false,
      reason: "blocked",
      message: "Room is currently blocked and unavailable.",
    };
  }

  if (hasOverlap(startDt, endDt, bookings)) {
    return {
      ok: false,
      reason: "overlap",
      message: "Room is already booked during that time.",
    };
  }

  return {
    ok: true,
    reason: "available",
    message: `Room is available from ${start} to ${end} (${durationMinutes} min).`,
    start,
    end,
  };
}

const FALLBACK_MESSAGES: Record<ReasonCode, string> = {
  invalid_time: "The start time could not be interpreted as a valid time.",
  invalid_duration: "The duration must be between 1 and 120 minutes.",
  past: "The requested start is in the past relative to the fixed current time.",
  blocked: "The room is blocked, so no slot is available.",
  overlap: "The requested range overlaps an existing booking.",
  available: "The room is available for the requested range.",
};

export function fallbackExplanation(reason: ReasonCode): string {
  return FALLBACK_MESSAGES[reason] ?? FALLBACK_MESSAGES.available;
}
