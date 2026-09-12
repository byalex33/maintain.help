import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { repositoryNameFilter } from "@/lib/repositoryIdentity";

it("escapes SQL pattern characters in case-insensitive repository names", () => {
  expect(repositoryNameFilter("Owner", "a_b%\\c").fullName).toEqual({
    equals: "Owner/a\\_b\\%\\\\c", mode: "insensitive",
  });
});

// Run against a migrated local test database; all inserted records are rolled back.
it.skipIf(!process.env.TEST_DATABASE_URL)("keeps underscore names distinct through Prisma's actual PostgreSQL query", async () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL! }) });
  const owner = `identity-${randomUUID()}`;
  const rollback = new Error("rollback identity fixtures");
  try {
    await expect(db.$transaction(async (tx) => {
      await tx.repository.createMany({ data: ["a-b", "a_b"].map((name) => ({
        githubId: -BigInt(`0x${randomUUID().replaceAll("-", "").slice(0, 12)}`),
        owner, name, fullName: `${owner}/${name}`, url: `https://github.com/${owner}/${name}`,
        topics: [], createdAtGithub: new Date(),
      })) });
      const names = async (name: string) => (await tx.repository.findMany({
        where: repositoryNameFilter(owner.toUpperCase(), name), select: { name: true },
      })).map((row) => row.name);
      expect(await names("A_B")).toEqual(["a_b"]);
      expect(await names("a-b")).toEqual(["a-b"]);
      expect(await names("a%b")).toEqual([]);
      expect(await names("a\\_b")).toEqual([]);
      throw rollback;
    })).rejects.toBe(rollback);
  } finally {
    await db.$disconnect();
  }
});
