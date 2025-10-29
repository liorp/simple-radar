import { initCanvas, drawRadarBase, drawRadarDots } from './radar.js';
import {
  initNetworkDOM,
  startHealthCheck,
  startRadarPolling,
  checkServerAvailability,
  radarDots
} from './network.js';

// Initialize application
function init() {
  initCanvas();
  initNetworkDOM();
  drawRadarBase();
  startHealthCheck();
  startRadarPolling();
}

// Render frame
function render() {
  checkServerAvailability();
  drawRadarBase();
  drawRadarDots(radarDots);
  requestAnimationFrame(render);
}

// Start application
init();
render();
