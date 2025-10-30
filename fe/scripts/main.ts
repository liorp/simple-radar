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

// Handle window resize
let resizeTimeout: number;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    initCanvas(); // Reinitialize canvas with new dimensions
  }, 250);
});

// Start application
init();
render();
