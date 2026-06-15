/**
 * SKYSHIELD v2 — Sensor System
 *
 * Manages track quality (TQ) for all enemies across all sensors.
 * Also handles HEL integrated sensor track-sharing.
 *
 * TQ tiers:
 *   0.00–0.25  — No track (enemy hidden / blurred icon)
 *   0.25–0.50  — Uncertain track (visible, no engagement)
 *   0.50–1.00  — Good track (weapons can engage; SAM Pk scales with TQ)
 *   1.00       — Perfect track (HEL always fires at this)
 *
 * TQ builds while an enemy is in sensor coverage.
 * TQ decays at TQ_DECAY per second when no sensor covers the enemy.
 */

import { dist } from '../engine/math.js';
import { SENSORS } from '../config/sensors.js';
import { ENEMIES } from '../config/threats.js';
import { TOWERS } from '../config/weapons.js';
import { bus } from '../engine/event-bus.js';

const TQ_DECAY = 0.10;  // TQ lost per second with no coverage

/**
 * Check whether a sensor covers an enemy.
 * Handles: range, angle (for directional sensors), RCS degradation, rf-only sensors.
 *
 * Returns a contribution rate [0, tqRate], or 0 if no coverage.
 */
function sensorContribution(sensor, enemy) {
  const def = SENSORS[sensor.kind];
  const thrDef = ENEMIES[enemy.type];

  // Distance check
  if (dist(sensor, enemy) > sensor.range) return 0;

  // RF-only sensors cannot see RF-silent threats
  if (def.rfOnly && thrDef.rfSilent) return 0;

  // Fiber detection: only eoir and acoustic can detect fiber-optic FPVs
  if (thrDef.fiber && !def.detectsFiber && !def.detectsAll) return 0;

  // Sector check for directional sensors (coverageAngle < 360)
  if (def.coverageAngle < 360) {
    const angle = Math.atan2(enemy.y - sensor.y, enemy.x - sensor.x) * 180 / Math.PI;
    let diff = Math.abs(((angle - sensor.facing + 540) % 360) - 180);
    if (diff > def.coverageAngle / 2) return 0;
  }

  // Jammable sensors: jammed if an EW-capable threat is within their jam radius
  // (Simplified: sensor is jammed if any jammable threat is within 180px — full impl in weapon-system)
  // For now: check if sensor is flagged as jammed by weapon-system
  if (def.jammable && sensor.jammed) return 0;

  // Poor-RCS reduction
  let rate = def.tqRate;
  if (def.poorRCS && def.poorRCS.includes(enemy.type)) rate *= 0.35;

  return rate;
}

/**
 * Update all sensor TQ contributions for all enemies.
 * Also updates HEL integrated sensor track-sharing.
 * Called once per frame from the main update loop.
 */
export function updateSensors(game, dt) {
  const { enemies, sensors, towers } = game;

  // Reset power load for sensor draw
  let sensorPowerDraw = 0;

  // For each enemy, accumulate TQ from all sensors
  for (const e of enemies) {
    if (e.dead) continue;

    let bestTQ = e.tq || 0;
    let covered = false;

    // --- Placed sensors ---
    for (const s of sensors) {
      if (s.hp <= 0) continue; // destroyed sensor
      const rate = sensorContribution(s, e);
      if (rate > 0) {
        covered = true;
        // Build TQ (never exceed 1.0)
        const contrib = Math.min(1.0, (e.tq || 0) + rate * dt);
        if (contrib > (e.tqBySensor?.get(s.id) || 0)) {
          if (!e.tqBySensor) e.tqBySensor = new Map();
          e.tqBySensor.set(s.id, contrib);
        }
      }
    }

    // --- HEL integrated EO/IR (always active if HEL tower is operational) ---
    for (const t of towers) {
      if (t.kind !== 'hel') continue;
      if (t.hp <= 0) continue;
      const helSensor = TOWERS.hel.integratedSensor;
      const d = dist(t, e);
      if (d <= helSensor.shareRange) {
        const thrDef = ENEMIES[e.type];
        // HEL EO/IR sees fiber, doesn't care about RF silence
        // Doesn't detect through heavy smoke (future weather mechanic)
        covered = true;
        const contrib = Math.min(1.0, (e.tq || 0) + helSensor.tqRate * dt);
        if (!e.tqBySensor) e.tqBySensor = new Map();
        const helKey = `hel_${t.x}_${t.y}`;
        if (contrib > (e.tqBySensor.get(helKey) || 0)) {
          e.tqBySensor.set(helKey, contrib);
        }
      }
    }

    // --- HPM integrated sensor upgrade ---
    for (const t of towers) {
      if (t.kind !== 'hpm' || !t.integratedSensor) continue;
      if (t.hp <= 0) continue;
      const iSensor = t.integratedSensor;
      const d = dist(t, e);
      if (d <= iSensor.shareRange) {
        covered = true;
        const contrib = Math.min(1.0, (e.tq || 0) + iSensor.tqRate * dt);
        if (!e.tqBySensor) e.tqBySensor = new Map();
        const key = `hpm_${t.x}_${t.y}`;
        if (contrib > (e.tqBySensor.get(key) || 0)) {
          e.tqBySensor.set(key, contrib);
        }
      }
    }

    // Net TQ = max across all sources
    if (e.tqBySensor && e.tqBySensor.size > 0) {
      bestTQ = Math.max(...e.tqBySensor.values());
    }

    // Decay individual source TQs when not covered
    if (!covered) {
      bestTQ = Math.max(0, bestTQ - TQ_DECAY * dt);
      if (e.tqBySensor) {
        for (const [k, v] of e.tqBySensor) {
          const decayed = Math.max(0, v - TQ_DECAY * dt);
          if (decayed <= 0) e.tqBySensor.delete(k);
          else e.tqBySensor.set(k, decayed);
        }
      }
    }

    // Update enemy TQ
    const prevTQ = e.tq || 0;
    e.tq = Math.min(1.0, bestTQ);

    // Events
    if (prevTQ < 0.25 && e.tq >= 0.25) bus.emit('threat:detected', { enemy: e });
    if (prevTQ >= 0.25 && e.tq < 0.25) bus.emit('threat:lost',     { enemy: e });
  }

  // Compute power draw from sensors
  for (const s of sensors) {
    if (s.hp > 0) sensorPowerDraw += (SENSORS[s.kind].powerDraw || 0);
  }

  return sensorPowerDraw;
}

/**
 * Get the best TQ for a given enemy (from all sources).
 * Returns 0 if no track data.
 */
export function getEnemyTQ(enemy) {
  return enemy.tq || 0;
}

/**
 * Check whether a sensor can detect a specific threat type at all
 * (ignoring distance — just capability check).
 */
export function sensorCanDetectType(sensorKind, threatType) {
  const def = SENSORS[sensorKind];
  const thrDef = ENEMIES[threatType];
  if (def.rfOnly && thrDef.rfSilent) return false;
  if (thrDef.fiber && !def.detectsFiber && !def.detectsAll) return false;
  return true;
}

/**
 * Returns the "visibility tier" for rendering:
 *   'hidden'    — tq < 0.10 (not even shown)
 *   'uncertain' — tq 0.10–0.50 (blurred track symbol)
 *   'tracked'   — tq >= 0.50 (full render)
 */
export function visibilityTier(enemy) {
  const tq = getEnemyTQ(enemy);
  if (tq < 0.10) return 'hidden';
  if (tq < 0.50) return 'uncertain';
  return 'tracked';
}

/**
 * Coverage map for the overlay renderer.
 * Returns an array of coverage circles/sectors for all placed sensors + HEL intrinsic sensors.
 * Each entry: { x, y, range, angle, color, tier }
 */
export function getCoverageZones(game) {
  const zones = [];

  for (const s of game.sensors) {
    if (s.hp <= 0) continue;
    const def = SENSORS[s.kind];
    zones.push({
      x: s.x, y: s.y,
      range: s.range,
      coverageAngle: def.coverageAngle,
      facing: s.facing || 0,
      color: def.color,
      kind: s.kind,
      jammed: s.jammed
    });
  }

  // HEL integrated EO/IR zones
  for (const t of game.towers) {
    if (t.kind !== 'hel' || t.hp <= 0) continue;
    const iSensor = TOWERS.hel.integratedSensor;
    zones.push({
      x: t.x, y: t.y,
      range: iSensor.shareRange,
      coverageAngle: 360,
      facing: 0,
      color: '#ffb347',   // EO/IR color
      kind: 'hel_eoir',
      jammed: false,
      integrated: true
    });
  }

  // HPM integrated sensor zones
  for (const t of game.towers) {
    if (t.kind !== 'hpm' || !t.integratedSensor || t.hp <= 0) continue;
    zones.push({
      x: t.x, y: t.y,
      range: t.integratedSensor.shareRange,
      coverageAngle: 360,
      facing: 0,
      color: '#c77dff',
      kind: 'hpm_sensor',
      jammed: false,
      integrated: true
    });
  }

  return zones;
}
