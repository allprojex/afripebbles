import { randomBytes } from "crypto";

// Excludes visually-ambiguous characters (0/O, 1/I/L) since this is read aloud
// and typed back in by customers when tracking an order or paying manually.
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomSuffix(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  }
  return out;
}

/**
 * Order references are never sequential — tracking requires reference +
 * email together, so guessability matters. Format: AP-YYYYMMDD-XXXXXX.
 */
export function generateOrderReference(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `AP-${y}${m}${d}-${randomSuffix(6)}`;
}
