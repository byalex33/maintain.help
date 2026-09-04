interface SavedRepositoryStore {
  upsert(args: { where: { userId_repositoryId: { userId: string; repositoryId: string } }; create: { userId: string; repositoryId: string }; update: Record<string, never> }): PromiseLike<unknown>;
  deleteMany(args: { where: { userId: string; repositoryId: string } }): PromiseLike<unknown>;
}

export async function setSavedRepository(store: SavedRepositoryStore, userId: string, repositoryId: string, saved: boolean) {
  const key = { userId, repositoryId };
  if (saved) await store.upsert({ where: { userId_repositoryId: key }, create: key, update: {} });
  else await store.deleteMany({ where: key });
}
