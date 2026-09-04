// Vitest doesn't run inside Next.js's client/server component boundary, so the
// real `server-only` package (which throws when imported outside a server
// context) is aliased to this no-op for tests.
export {};
