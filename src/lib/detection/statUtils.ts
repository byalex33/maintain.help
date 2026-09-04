export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function daysBetween(earlier: Date | string, later: Date | string): number {
  const a = typeof earlier === "string" ? new Date(earlier) : earlier;
  const b = typeof later === "string" ? new Date(later) : later;
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

export function hoursBetween(earlier: Date | string, later: Date | string): number {
  const a = typeof earlier === "string" ? new Date(earlier) : earlier;
  const b = typeof later === "string" ? new Date(later) : later;
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}
