import { useState } from "react";
import {
  CalendarClock,
  CircleCheck,
  CircleX,
  Clock,
  Users,
  Sparkles,
  Loader2,
} from "lucide-react";
import { CURRENT_TIME, ROOM, BOOKINGS } from "@/fixtures/room";
import {
  checkAvailability,
  fallbackExplanation,
  type CheckResult,
} from "@/lib/checkAvailability";
import {
  explainAvailability,
} from "@/lib/explainAvailability";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function currentDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BookingRow({ start, end, title }: { start: string; end: string; title: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
      <span className="font-medium text-slate-700">{title}</span>
      <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
        <Clock className="h-4 w-4" />
        {formatTime(start)} – {formatTime(end)}
      </span>
    </li>
  );
}

type ExplainState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; text: string }
  | { kind: "fallback"; text: string };

export default function App() {
  const [start, setStart] = useState("11:30");
  const [duration, setDuration] = useState("30");
  const [blocked, setBlocked] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [explain, setExplain] = useState<ExplainState>({ kind: "idle" });

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const next = checkAvailability({
      start,
      durationMinutes: Number(duration),
      blocked,
    });
    setResult(next);
    setExplain({ kind: "idle" });
  };

  const handleExplain = async () => {
    if (!result) return;
    setExplain({ kind: "loading" });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const out = await explainAvailability(
        {
          roomLabel: ROOM.name,
          start,
          end: result.ok ? result.end : "",
          isAvailable: result.ok,
          reasonCode: result.reason,
        },
        { signal: controller.signal },
      );
      setExplain({ kind: "ready", text: out.explanation });
    } catch {
      const text = fallbackExplanation(result.reason);
      setExplain({ kind: "fallback", text });
    } finally {
      clearTimeout(timeout);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-emerald-50 px-4 py-8 sm:py-12">
      <main className="mx-auto w-full max-w-xl">
        <header className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <CalendarClock className="h-4 w-4" />
            Smart Campus
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Room Availability Checker
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Current time:{" "}
            <span className="font-semibold text-slate-900">
              {currentDateLabel(CURRENT_TIME)}
            </span>
          </p>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{ROOM.name}</h2>
              <p className="text-sm text-slate-500">{ROOM.floor}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              <Users className="h-4 w-4" />
              {ROOM.capacity} seats
            </span>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
            <input
              type="checkbox"
              checked={blocked}
              onChange={(e) => setBlocked(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-amber-600"
            />
            <span>
              <span className="block text-sm font-semibold text-amber-900">
                Room blocked
              </span>
              <span className="block text-sm text-amber-700">
                Simulate maintenance or closure.
              </span>
            </span>
          </label>

          <form onSubmit={handleCheck} className="mt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="start" className="mb-1 block text-sm font-medium text-slate-700">
                  Start time
                </label>
                <input
                  id="start"
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label htmlFor="duration" className="mb-1 block text-sm font-medium text-slate-700">
                  Duration (minutes)
                </label>
                <input
                  id="duration"
                  type="number"
                  min={1}
                  max={120}
                  step={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-[0.99]"
            >
              Check availability
            </button>
          </form>

          {result && (
            <div
              role="status"
              className={`mt-5 flex items-start gap-3 rounded-xl px-4 py-3 ring-1 ${
                result.ok
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-300"
                  : "bg-red-50 text-red-800 ring-red-300"
              }`}
            >
              {result.ok ? (
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              )}
              <p className="text-sm font-medium">{result.message}</p>
            </div>
          )}

          {result && (
            <div className="mt-5">
              <button
                type="button"
                onClick={handleExplain}
                disabled={explain.kind === "loading"}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {explain.kind === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Explain availability
              </button>

              {(explain.kind === "ready" || explain.kind === "fallback") && (
                <div
                  className="mt-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
                  aria-live="polite"
                >
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Generated explanation (not the booking status)
                    {explain.kind === "fallback" ? " — fallback" : " — mock"}
                  </p>
                  <p className="text-sm text-slate-700">{explain.text}</p>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Today's bookings
          </h3>
          <ul className="space-y-2">
            {BOOKINGS.map((b) => (
              <BookingRow key={b.id} start={b.start} end={b.end} title={b.title} />
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
