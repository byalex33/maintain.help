import "dotenv/config";
import { ingestRepository } from "../src/lib/ingest";
import { GitHubRateLimitError } from "../src/lib/github/client";

export const CALIBRATION_REPOSITORIES = [
  "facebook/react",
  "expressjs/express",
  "pallets/flask",
  "lodash/lodash",
  "jashkenas/underscore",
  "standard/standard",
  "PyGithub/PyGithub",
  "gnunn1/tilix",
  "andyboeh/esphome-elero",
  "firstcontributions/first-contributions",
  "public-apis/public-apis",
  "angular/angular",
  "microsoft/vscode",
  "atom/atom",
  "stedolan/jq",
];

async function main() {
  for (const fullName of CALIBRATION_REPOSITORIES) {
    const [owner, repo] = fullName.split("/");
    try {
      const result = await ingestRepository(owner, repo);
      console.log(`${result.fullName}: ${result.status} (${result.statusConfidence}), score ${result.capacityPressureScore ?? 0}`);
    } catch (error) {
      console.error(`${fullName}: ${error instanceof Error ? error.message : "failed"}`);
      if (error instanceof GitHubRateLimitError) break;
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
