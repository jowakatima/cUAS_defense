/**
 * SKYSHIELD v2 — Sensor Coverage Overlay
 *
 * Renders sensor footprints as semi-transparent zones on the field.
 * Three quality tiers:
 *   Good    (TQ → 1.0)  — green tint
 *   Partial (TQ → 0.5)  — amber tint
 *   Detect  (TQ → 0.25) — red tint
 *   Blind               — no overlay (dark field)
 *
 * Also draws jammed sensor X indicator and integrated sensor halos.
 */

import { SENSORS } from '../config/sensors.js';
import { getCoverageZones } from '../systems/sensor-system.js';

/**
 * Draw all sensor coverage zones.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} game
 * @param {boolean} showOverlay — only draw when in sensor-selection mode or always-on setting
 */
export function drawCoverageOverlay(ctx, game, showOverlay) {
  if (!showOverlay) return;

  const zones = getCoverageZones(game);

  ctx.save();
  for (const z of zones) {
    drawZone(ctx, z);
  }
  ctx.restore();
}

function drawZone(ctx, z) {
  const { x, y, range, coverageAngle, facing, color, jammed, integrated } = z;

  ctx.save();

  if (jammed) {
    // Jammed sensor: draw grey hatched circle
    ctx.strokeStyle = 'rgba(120,120,120,0.4)';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // X overlay
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 10); ctx.lineTo(x + 10, y + 10);
    ctx.moveTo(x + 10, y - 10); ctx.lineTo(x - 10, y + 10);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Parse hex color to RGBA
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const alpha = integrated ? 0.08 : 0.14;

  if (coverageAngle >= 360) {
    // Full circle coverage
    const grad = ctx.createRadialGradient(x, y, 0, x, y, range);
    grad.addColorStop(0,   `rgba(${r},${g},${b},${alpha * 1.5})`);
    grad.addColorStop(0.6, `rgba(${r},${g},${b},${alpha})`);
    grad.addColorStop(1.0, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.fill();

    // Rim
    ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
    ctx.lineWidth = integrated ? 1 : 1.5;
    if (integrated) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

  } else {
    // Sector coverage
    const halfAngle = (coverageAngle / 2) * (Math.PI / 180);
    const startAng  = (facing * Math.PI / 180) - halfAngle;
    const endAng    = (facing * Math.PI / 180) + halfAngle;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, startAng, endAng);
    ctx.closePath();

    const grad = ctx.createRadialGradient(x, y, 0, x, y, range);
    grad.addColorStop(0,   `rgba(${r},${g},${b},${alpha * 1.8})`);
    grad.addColorStop(1.0, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw a small sensor icon at (x, y) for toolbar/placement ghost.
 * Reuses the kind string from SENSORS.
 */
export function drawSensorIcon(ctx, kind, x, y) {
  const def = SENSORS[kind];
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = def.color;
  ctx.fillStyle   = def.color;
  ctx.lineWidth   = 1.6;

  switch (kind) {
    case 'lband':
      // Radar dish shape
      ctx.beginPath();
      ctx.arc(0, 2, 10, Math.PI, 0, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 2); ctx.lineTo(0, -12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -12, 2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'xband':
      // Directional wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 13, -Math.PI / 4, Math.PI / 4);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'kaband':
      // Small omni rings
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
      break;

    case 'eoir':
      // Camera / optical lens
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-13, 0); ctx.lineTo(-10, 0);
      ctx.moveTo( 10, 0); ctx.lineTo( 13, 0);
      ctx.stroke();
      break;

    case 'rfesm':
      // Passive antenna — triangle pointing up
      ctx.beginPath();
      ctx.moveTo(0, -13); ctx.lineTo(8, 4); ctx.lineTo(-8, 4);
      ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 4, 2, 0, Math.PI * 2); ctx.fill();
      break;

    case 'acoustic':
      // Sound waves
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      for (let r = 7; r <= 12; r += 5) {
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.7, Math.PI * 0.7);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI * 0.3, Math.PI * 1.7);
        ctx.stroke();
      }
      break;

    default:
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
