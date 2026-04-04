/**
 * Debug logging for auth flows. Enable with NODE_ENV=development,
 * NEXT_PUBLIC_AUTH_DEBUG=1 (client), or AUTH_DEBUG=1 (server).
 * Never log passwords or full tokens.
 */

function clientEnabled() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_AUTH_DEBUG === "1"
  );
}

function serverEnabled() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.AUTH_DEBUG === "1"
  );
}

export function authDebugClient(label: string, payload?: Record<string, unknown>) {
  if (typeof window === "undefined" || !clientEnabled()) return;
  if (payload !== undefined) {
    console.log(`[auth:client] ${label}`, payload);
  } else {
    console.log(`[auth:client] ${label}`);
  }
}

export function authDebugServer(label: string, payload?: Record<string, unknown>) {
  if (!serverEnabled()) return;
  if (payload !== undefined) {
    console.log(`[auth:server] ${label}`, payload);
  } else {
    console.log(`[auth:server] ${label}`);
  }
}
