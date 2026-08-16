const SECRET_KEYS = /password|secret|token|authorization|ssn|account[_-]?number/i;
const DIGIT_RUN = /\b\d{9,}\b/g;

export function redactValue(name: string, value: string, sensitivity?: string): string {
  if (sensitivity === "secret" || sensitivity === "pii") return `[redacted:${name}]`;
  if (SECRET_KEYS.test(name)) return `[redacted:${name}]`;
  return value.replace(DIGIT_RUN, "[id]");
}

export function redactRecord(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === "string") out[k] = redactValue(k, v);
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = redactRecord(v as Record<string, unknown>);
    } else out[k] = v;
  }
  return out;
}

export function looksSensitive(text: string): boolean {
  return SECRET_KEYS.test(text);
}
