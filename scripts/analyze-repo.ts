import "dotenv/config";
import { ingestRepository } from "../src/lib/ingest";
import { db } from "../src/lib/db";
import { parseGitHubRepoUrl } from "../src/lib/github/parseUrl";

async function main() {
  const ref = parseGitHubRepoUrl(process.argv[2] ?? "");
  if (!ref) throw new Error("Usage: npm run analyze:repo -- owner/repo");
  const repository = await ingestRepository(ref.owner, ref.repo);
  const snapshot = await db.repositoryMetricSnapshot.findFirst({ where: { repositoryId: repository.id }, orderBy: { capturedAt: "desc" } });
  const evidence = await db.repositoryEvidence.findMany({ where: { repositoryId: repository.id }, orderBy: { discoveredAt: "desc" }, take: 5 });
  console.log(`\nRepository:\n${repository.fullName}\n\nStatus:\n${repository.status.replaceAll("_", " ")}\n\nConfidence:\n${repository.statusConfidence}\n\nScore:\n${repository.capacityPressureScore ?? 0}\n\nSignals:`);
  for (const signal of evidence) console.log(`* ${signal.title}`);
  console.log(`\nActive maintainers:\n${snapshot?.activeMaintainersLast365d ?? 0}\n\nExplicit maintainer request:\n${repository.statusVerified ? "Yes" : "No"}`);
  await db.$disconnect();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
