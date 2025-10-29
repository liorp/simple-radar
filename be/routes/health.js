import { CORS_HEADERS } from '../config.js';

// Health check endpoint handler
export function handleHealth() {
  // 80% chance of being healthy
  const healthy = Math.random() > 0.2;

  return new Response(
    JSON.stringify({ healthy }),
    { headers: CORS_HEADERS }
  );
}
