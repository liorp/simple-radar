import { MAX_DOTS } from './config.js';

// Canvas and context (to be initialized)
let canvas, ctx;
let width, height, centerX, centerY, maxRadius;

// Initialize canvas dimensions and context
export function initCanvas() {
  canvas = document.getElementById("radar");
  ctx = canvas.getContext("2d");

  width = canvas.width;
  height = canvas.height;
  centerX = width / 2;
  centerY = height / 2;
  maxRadius = Math.min(width, height) / 2 - 20;
}

// Draw the static radar base (grid, circles, crosshairs)
export function drawRadarBase() {
  ctx.clearRect(0, 0, width, height);

  // Draw concentric circles (distance rings)
  ctx.strokeStyle = "rgba(0, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, (maxRadius / 4) * i, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw crosshairs (quadrant dividers)
  ctx.strokeStyle = "rgba(0, 255, 255, 0.25)";
  ctx.lineWidth = 1.5;

  // Vertical line
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - maxRadius);
  ctx.lineTo(centerX, centerY + maxRadius);
  ctx.stroke();

  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(centerX - maxRadius, centerY);
  ctx.lineTo(centerX + maxRadius, centerY);
  ctx.stroke();

  // Draw center point
  ctx.fillStyle = "rgba(0, 255, 255, 0.6)";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
  ctx.fill();

  // Draw outer border
  ctx.strokeStyle = "rgba(0, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
  ctx.stroke();
}

// Convert cartesian coordinates (from CSV) to canvas coordinates
export function cartesianToCanvas(x, y) {
  // Scale factor: CSV coordinates are in meters, we need to scale to fit radar
  // Assume max range of ~20 meters to fit nicely in the radar circle
  const scale = maxRadius / 20;

  // Convert: CSV x,y to canvas coordinates
  // Canvas: (0,0) is top-left, positive x is right, positive y is down
  // CSV: (0,0) is radar center, positive x is right, positive y is forward/up
  const canvasX = centerX + (x * scale);
  const canvasY = centerY - (y * scale); // Invert y because canvas y is down

  return { x: canvasX, y: canvasY };
}

// Calculate distance from center for a point
function calculateDistance(x, y) {
  const dx = x - centerX;
  const dy = y - centerY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Draw tooltip for a single dot
function drawDotTooltip(dot, opacity) {
  const tooltipOffset = 15;
  const tooltipX = dot.canvasX + tooltipOffset;
  const tooltipY = dot.canvasY - tooltipOffset;
  const padding = 6;
  const lineHeight = 12;

  // Prepare text - show track_id, range, velocity
  const texts = [
    `ID:${dot.track_id || '?'}`,
    `R:${dot.range ? dot.range.toFixed(1) : '?'}`,
    `V:${dot.velocity ? dot.velocity.toFixed(1) : '?'}`
  ];

  // Set font for measurement
  ctx.font = '9px monospace';

  // Calculate tooltip dimensions
  const maxWidth = Math.max(...texts.map(t => ctx.measureText(t).width));
  const tooltipWidth = maxWidth + padding * 2;
  const tooltipHeight = texts.length * lineHeight + padding * 2;

  // Draw tooltip background
  ctx.fillStyle = `rgba(10, 14, 39, ${0.9 * opacity})`;
  ctx.strokeStyle = `rgba(255, 68, 102, ${0.5 * opacity})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 3);
  ctx.fill();
  ctx.stroke();

  // Draw text lines
  ctx.fillStyle = `rgba(255, 68, 102, ${opacity})`;
  ctx.font = '9px monospace';
  texts.forEach((text, i) => {
    ctx.fillText(text, tooltipX + padding, tooltipY + padding + lineHeight * (i + 1) - 2);
  });
}

// Draw all radar dots
export function drawRadarDots(radarDots) {
  radarDots.forEach((dot, index) => {
    // Calculate opacity based on age (newer dots are brighter)
    const age = radarDots.length - index;
    const opacity = Math.max(0.1, 1 - age / MAX_DOTS);

    // Draw dot
    ctx.fillStyle = `rgba(255, 68, 102, ${opacity})`;
    ctx.beginPath();
    ctx.arc(dot.canvasX, dot.canvasY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Add glow effect to newest dots
    if (index === radarDots.length - 1) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(255, 68, 102, 0.8)";
      ctx.fillStyle = "rgba(255, 68, 102, 1)";
      ctx.beginPath();
      ctx.arc(dot.canvasX, dot.canvasY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw tooltip for each dot
    drawDotTooltip(dot, opacity);
  });
}
