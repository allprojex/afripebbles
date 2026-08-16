const DEFAULT_HOST = "127.0.0.1";

/** PORT has no safe default — every environment must set it explicitly. */
export function resolvePort(env: NodeJS.ProcessEnv = process.env): number {
  const rawPort = env["PORT"];
  if (!rawPort) {
    throw new Error("PORT environment variable is required but was not provided.");
  }

  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  return port;
}

/**
 * Defaults to loopback-only so an unconfigured deployment never ends up
 * listening on every interface — Nginx (or a local dev proxy) reaches this
 * process over localhost either way. Set HOST=0.0.0.0 explicitly if a
 * deployment genuinely needs to accept connections from other interfaces.
 */
export function resolveHost(env: NodeJS.ProcessEnv = process.env): string {
  const rawHost = env["HOST"];
  return rawHost && rawHost.trim() !== "" ? rawHost : DEFAULT_HOST;
}
