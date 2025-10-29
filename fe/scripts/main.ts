import { initCanvas, drawRadarBase, drawRadarDots } from './radar.ts';
import {
  initNetworkDOM,
  startHealthCheck,
  startRadarPolling,
  checkServerAvailability,
  radarDots
} from './network.ts';

// Initialize application
function init(): void {
  initCanvas(); // Creates offscreen canvas and draws static base
  initNetworkDOM();
  startHealthCheck();
  startRadarPolling();
}

// Render frame
function render(): void {
  checkServerAvailability();
  drawRadarBase();
  drawRadarDots(radarDots);
  requestAnimationFrame(render);
}

// Start application
init();
render();
