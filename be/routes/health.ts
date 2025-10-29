import { CORS_HEADERS } from '../config.ts';

// Health check endpoint handler
export function handleHealth(): Response {
  // 80% chance of being healthy
  const healthy: boolean = Math.random() > 0.2;

  return new Response(
    JSON.stringify({ healthy }),
    { headers: CORS_HEADERS }
  );
}
