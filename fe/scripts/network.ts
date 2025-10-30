import { API_BASE, HEALTH_CHECK_INTERVAL, RADAR_CHECK_INTERVAL, SERVER_TIMEOUT, MAX_DOTS } from './config.ts';
import { cartesianToCanvas } from './radar.ts';
import type { RadarDot, RadarResponse, HealthResponse } from '../../types.ts';

// DOM elements
let statusElement: HTMLElement | null;

// State
export let radarDots: RadarDot[] = [];
export let lastDataReceived: number = Date.now();

// Track history for trail effect
let trackHistory: Map<number, RadarDot[]> = new Map(); // track_id -> array of positions

// Initialize DOM references
export function initNetworkDOM(): void {
  statusElement = document.getElementById("status");
}

// Check if server is responding and clear dots if needed
export function checkServerAvailability(): void {
  const timeSinceLastData: number = Date.now() - lastDataReceived;
  if (timeSinceLastData > SERVER_TIMEOUT && radarDots.length > 0) {
    radarDots.length = 0; // Clear array
  }
}

// Health check function
async function checkHealth(): Promise<void> {
  try {
    const response: Response = await fetch(`${API_BASE}/health`);
    const data: HealthResponse = await response.json();

    if (statusElement) {
      if (data.healthy) {
        statusElement.textContent = "HEALTHY";
        statusElement.className = "hud-status healthy";
      } else {
        statusElement.textContent = "NOT HEALTHY";
        statusElement.className = "hud-status unhealthy";
      }
    }
  } catch (error) {
    if (statusElement) {
      statusElement.textContent = "OFFLINE";
      statusElement.className = "hud-status unhealthy";
    }
    console.error("Health check failed:", error);
  }
}

// Radar data polling function
async function pollRadarData(): Promise<void> {
  try {
    const response: Response = await fetch(`${API_BASE}/radar`);
    const data: RadarResponse = await response.json();

    // Update last data received timestamp
    lastDataReceived = Date.now();

    // Clear the current dots array
    radarDots.length = 0;

    // Process each target from the API
    if (data.targets && Array.isArray(data.targets)) {
      data.targets.forEach(target => {
        // Convert polar coordinates (x,y give angle via atan2, range gives radial distance) to canvas coordinates
        const canvasPos = cartesianToCanvas(target.x, target.y, target.range);

        // Create dot with all necessary data
        const dot = {
          track_id: target.track_id,
          x: target.x,
          y: target.y,
          canvasX: canvasPos.x,
          canvasY: canvasPos.y,
          velocity: target.velocity,
          range: target.range,
          doppler: target.doppler,
          class: target.class,
          timestamp: Date.now(),
        };

        // Add to current dots
        radarDots.push(dot);

        // Update track history for trail effect
        if (!trackHistory.has(target.track_id)) {
          trackHistory.set(target.track_id, []);
        }
        const history = trackHistory.get(target.track_id)!;
        history.push(dot);

        // Limit history size per track
        if (history.length > MAX_DOTS) {
          history.shift();
        }
      });

      // Clean up history for tracks that are no longer present
      const currentTrackIds = new Set(data.targets.map(t => t.track_id));
      for (const [trackId, history] of trackHistory.entries()) {
        if (!currentTrackIds.has(trackId)) {
          // Track is gone, gradually remove from history
          if (history.length > 0) {
            history.shift();
            if (history.length === 0) {
              trackHistory.delete(trackId);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Radar data fetch failed:", error);
    // Don't update lastDataReceived on error
  }
}

// Start health check polling
export function startHealthCheck(): void {
  checkHealth(); // Initial check
  setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
}

// Start radar polling
export function startRadarPolling(): void {
  setInterval(pollRadarData, RADAR_CHECK_INTERVAL);
}
