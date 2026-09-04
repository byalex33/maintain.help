const DAY = 24 * 60 * 60 * 1000;

export function nextAnalysisDate(
  repository: { isArchived: boolean; stars: number; statusVerified: boolean },
  now = new Date()
): Date {
  const days = repository.isArchived ? 30 : repository.statusVerified || repository.stars >= 10_000 ? 2 : 7;
  return new Date(now.getTime() + days * DAY);
}

export function isDueForAnalysis(nextAnalysisAt: Date | null, now = new Date()): boolean {
  return nextAnalysisAt === null || nextAnalysisAt <= now;
}
