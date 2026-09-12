import { cache } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UpvoteButton } from "./upvote-button";

// One lookup per render, shared by every repository card.
const viewerLikes = cache(async () => {
  const session = await auth();
  if (!session?.user) return null;
  const likes = await db.repositoryUpvote.findMany({
    where: { userId: session.user.id }, select: { repositoryId: true },
  });
  return new Set(likes.map((like) => like.repositoryId));
});

export async function RepoLike({ repositoryId, repositoryPath, count }: { repositoryId: string; repositoryPath: string; count: number }) {
  const likes = await viewerLikes();
  return <UpvoteButton repositoryId={repositoryId} repositoryPath={repositoryPath} count={count} upvoted={likes?.has(repositoryId) ?? false} signedIn={likes !== null} />;
}
