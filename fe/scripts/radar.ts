import { MAX_DOTS } from "./config.ts";
import type { RadarDot, CanvasCoordinates } from "../../types.ts";

// Canvas and context (to be initialized)
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let width: number,
  height: number,
  centerX: number,
  centerY: number,
  maxRadius: number;

// Offscreen canvas for static radar base (optimization)
let baseCanvas: HTMLCanvasElement;
let baseCtx: CanvasRenderingContext2D;

// Initialize canvas dimensions and context
export function initCanvas(): void {
  canvas = document.getElementById("radar") as HTMLCanvasElement;
  ctx = canvas.getContext("2d")!;

  width = canvas.width;
  height = canvas.height;
  centerX = width / 2;
  centerY = height / 2;
  maxRadius = Math.min(width, height) / 2 - 20;

  // Create offscreen canvas for static base
  baseCanvas = document.createElement("canvas");
  baseCanvas.width = width;
  baseCanvas.height = height;
  baseCtx = baseCanvas.getContext("2d")!;

  // Draw the static base once to the offscreen canvas
  drawStaticBase();
}

// Draw the static radar base once to offscreen canvas
function drawStaticBase(): void {
  // Draw concentric circles (distance rings)
  baseCtx.strokeStyle = "rgba(0, 255, 255, 0.15)";
  baseCtx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    baseCtx.beginPath();
    baseCtx.arc(centerX, centerY, (maxRadius / 4) * i, 0, Math.PI * 2);
    baseCtx.stroke();
  }

  // Draw crosshairs (quadrant dividers)
  baseCtx.strokeStyle = "rgba(0, 255, 255, 0.25)";
  baseCtx.lineWidth = 1.5;

  // Vertical line
  baseCtx.beginPath();
  baseCtx.moveTo(centerX, centerY - maxRadius);
  baseCtx.lineTo(centerX, centerY + maxRadius);
  baseCtx.stroke();

  // Horizontal line
  baseCtx.beginPath();
  baseCtx.moveTo(centerX - maxRadius, centerY);
  baseCtx.lineTo(centerX + maxRadius, centerY);
  baseCtx.stroke();

  // Draw center point
  baseCtx.fillStyle = "rgba(0, 255, 255, 0.6)";
  baseCtx.beginPath();
  baseCtx.arc(centerX, centerY, 4, 0, Math.PI * 2);
  baseCtx.fill();

  // Draw outer border
  baseCtx.strokeStyle = "rgba(0, 255, 255, 0.3)";
  baseCtx.lineWidth = 2;
  baseCtx.beginPath();
  baseCtx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
  baseCtx.stroke();
}

// Composite the static base onto main canvas (called each frame)
export function drawRadarBase(): void {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw the pre-rendered base from offscreen canvas
  ctx.drawImage(baseCanvas, 0, 0);
}

// Convert polar coordinates (from CSV) to canvas coordinates
export function cartesianToCanvas(
  x: number,
  y: number,
  range: number
): CanvasCoordinates {
  // Calculate polar angle from x,y components using atan2
  const angle: number = Math.atan2(y, x);

  // Scale factor: range is in meters, we need to scale to fit radar
  // Assume max range of ~20 meters to fit nicely in the radar circle
  const scale: number = maxRadius / 20;

  // Convert from polar (angle, range) to canvas Cartesian coordinates
  // Canvas: (0,0) is top-left, positive x is right, positive y is down
  // Radar: angle 0 is to the right (east), angle increases counter-clockwise
  const scaledRange: number = range * scale;
  const canvasX: number = centerX + scaledRange * Math.cos(angle);
  const canvasY: number = centerY - scaledRange * Math.sin(angle); // Invert y because canvas y is down

  return { x: canvasX, y: canvasY };
}

// Draw tooltip for a single dot
function drawDotTooltip(dot: RadarDot, opacity: number): void {
  const tooltipOffset: number = 15;
  const tooltipX: number = dot.canvasX + tooltipOffset;
  const tooltipY: number = dot.canvasY - tooltipOffset;
  const padding: number = 6;
  const lineHeight: number = 12;

  // Prepare text - show track_id, range, velocity
  const texts: string[] = [
    `ID:${dot.track_id || "?"}`,
    `R:${dot.range ? dot.range.toFixed(1) : "?"}`,
    `V:${dot.velocity ? dot.velocity.toFixed(1) : "?"}`,
  ];

  // Set font for measurement
  ctx.font = "9px monospace";

  // Calculate tooltip dimensions
  const maxWidth: number = Math.max(
    ...texts.map((t) => ctx.measureText(t).width)
  );
  const tooltipWidth: number = maxWidth + padding * 2;
  const tooltipHeight: number = texts.length * lineHeight + padding * 2;

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
  ctx.font = "9px monospace";
  texts.forEach((text, i) => {
    ctx.fillText(
      text,
      tooltipX + padding,
      tooltipY + padding + lineHeight * (i + 1) - 2
    );
  });
}

// Draw all radar dots
export function drawRadarDots(radarDots: RadarDot[]): void {
  radarDots.forEach((dot, index) => {
    // Calculate opacity based on age (newer dots are brighter)
    const age: number = radarDots.length - index;
    const opacity: number = Math.max(0.1, 1 - age / MAX_DOTS);

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
