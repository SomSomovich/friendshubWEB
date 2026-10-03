/**
 * Environment lookup that works in both the browser and Node.
 *
 * Vite replaces the `import.meta.env` object at build time with the values from
 * `.env` files and `process.env`; Node (where the smoke scripts import these
 * modules) has no `import.meta.env` at all, so `process.env` is consulted as a
 * fallback. Keeping both paths means the same client code — and the same
 * fallbacks — run in the app and in the harnesses.
 */
const VITE_ENV: Record<string, string | undefined> | undefined =
  // `typeof` guards the Node case, where the property does not exist.
  typeof import.meta.env === 'undefined'
    ? undefined
    : (import.meta.env as unknown as Record<string, string | undefined>)

function fromProcess(key: string): string | undefined {
  const processLike = globalThis as { process?: { env?: Record<string, string | undefined> } }
  return processLike.process?.env?.[key]
}

export function readEnvVar(key: string, fallback: string): string {
  const value = VITE_ENV?.[key] ?? fromProcess(key)
  return value !== undefined && value.length > 0 ? value : fallback
}
