import { CORS_HEADERS } from '../config.js';
import { getCurrentTargets } from '../data/csvHandler.js';

// Radar data endpoint handler - returns all current targets
export function handleRadar() {
  const targets = getCurrentTargets();

  return new Response(
    JSON.stringify({ targets }),
    { headers: CORS_HEADERS }
  );
}
