/** Parses an integer query parameter; non-integers fall back, out-of-range values clamp. */
export function clampInteger(
  raw: string | null,
  options: { min: number; max: number; fallback: number },
): number {
  if (raw === null || !/^-?\d+$/.test(raw.trim())) {
    return options.fallback;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value)) {
    return options.fallback;
  }
  return Math.min(options.max, Math.max(options.min, value));
}
