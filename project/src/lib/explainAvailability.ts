// Mock LLM explanation adapter. Clearly labeled as a mock — no network, no
// external API, no client-side keys. The deterministic checkAvailability()
// remains authoritative; this adapter only rephrases facts it is given and can
// never change availability or booking data.

export interface ExplanationInput {
  roomLabel: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  isAvailable: boolean;
  reasonCode: string;
}

export interface ExplanationOutput {
  explanation: string;
}

const MAX_INPUT_LEN = 200;
const MAX_OUTPUT_LEN = 300;
const TIMEOUT_MS = 3000;

const VALID_REASON_CODES = new Set([
  "invalid_time",
  "invalid_duration",
  "past",
  "blocked",
  "overlap",
  "available",
]);

export class ExplanationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExplanationError";
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateExplanationInput(
  input: Partial<ExplanationInput> | null | undefined,
): ExplanationInput {
  if (!input || typeof input !== "object") {
    throw new ExplanationError("Input is required.");
  }
  const { roomLabel, start, end, isAvailable, reasonCode } = input;

  if (!isNonEmptyString(roomLabel) || roomLabel.length > MAX_INPUT_LEN) {
    throw new ExplanationError("roomLabel must be a non-empty string (<= 200 chars).");
  }
  if (!isNonEmptyString(start) || !TIME_PATTERN.test(start) || start.length > MAX_INPUT_LEN) {
    throw new ExplanationError("start must be a valid HH:MM time (<= 200 chars).");
  }
  if (!isNonEmptyString(end) || !TIME_PATTERN.test(end) || end.length > MAX_INPUT_LEN) {
    throw new ExplanationError("end must be a valid HH:MM time (<= 200 chars).");
  }
  if (typeof isAvailable !== "boolean") {
    throw new ExplanationError("isAvailable must be a boolean.");
  }
  if (!isNonEmptyString(reasonCode) || !VALID_REASON_CODES.has(reasonCode)) {
    throw new ExplanationError("reasonCode must be a known reason code.");
  }

  const isAvailableReason = reasonCode === "available";
  if (isAvailable !== isAvailableReason) {
    throw new ExplanationError("isAvailable must be consistent with reasonCode.");
  }

  return { roomLabel, start, end, isAvailable, reasonCode };
}

function validateExplanationOutput(output: unknown): ExplanationOutput {
  if (!output || typeof output !== "object") {
    throw new ExplanationError("Output must be an object.");
  }
  const explanation = (output as { explanation?: unknown }).explanation;
  if (!isNonEmptyString(explanation) || explanation.length > MAX_OUTPUT_LEN) {
    throw new ExplanationError("explanation must be a non-empty string (<= 300 chars).");
  }
  return { explanation: explanation.trim() };
}

function buildMockSentence(input: ExplanationInput): string {
  const status = input.isAvailable ? "available" : "not available";
  const detail =
    input.reasonCode === "available"
      ? "no existing bookings overlap this range"
      : `the request was rejected (${input.reasonCode})`;
  return `${input.roomLabel} is ${status} from ${input.start} to ${input.end}: ${detail}.`;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new ExplanationError("Timed out."));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new ExplanationError("Timed out."));
    }
    signal.addEventListener("abort", onAbort);
  });
}

export async function explainAvailability(
  rawInput: Partial<ExplanationInput> | null | undefined,
  options: {
    timeoutMs?: number;
    signal?: AbortSignal;
    build?: (input: ExplanationInput) => string;
  } = {},
): Promise<ExplanationOutput> {
  const input = validateExplanationInput(rawInput);
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const signal = options.signal ?? new AbortController().signal;

  // Simulated latency for the mock adapter so the timeout path is reachable.
  const latency = Math.min(timeoutMs - 1, 50);
  await delay(latency, signal);

  const output = options.build ? options.build(input) : buildMockSentence(input);
  return validateExplanationOutput({ explanation: output });
}
