/**
 * SKYSHIELD v2 — Sensor System
 */

import { dist } from '../engine/math.js';
import { SENSORS } from '../config/sensors.js';
import { ENEMIES } from '../config/threats.js';
import { TOWERS } from '../config/weapons.js';
import { bus } from '../engine/event-bus.js';

const TQ_DECAY = 0.10;

function sensorContribution(sensor, enemy) {
  const def = SENSORS[sensor.kind];
  const thrDef = ENEMIES[enemy.type];

  if (dist(sensor, enemy) > sensor.range) return 0;
  if (def.rfOnly && thrDef.rfSilent) return 0;
  if (thrDef.fiber && !def.detectsFiber && !def.detectsAll) return 0;

  if (def.coverageAngle < 360) {
    const angle = Math.atan2(enemy.y - sensor.y, enemy.x - sensor.x) * 180 / Math.PI;
    let diff = Math.abs(((angle - sensor.facing + 540) % 360) - 180);
    if (diff > def.coverageAngle / 2) return 0;
  }

  if (def.jammable && sensor.jammed) return 0;

  let rate = def.tqRate;
  if (def.poorRCS && def.poorRCS.includes(enemy.type)) rate *= 0.35;

  return rate;
}

export function updateSensors(game, dt) {
  const { enemies, sensors, towers } = game;
  let sensorPowerDraw = 0;

  for (const e of enemies) {
    if (e.dead) continue;

    let bestTQ = e.tq || 0;
    let covered = false;

    for (const s of sensors) {
      if (s.hp <= 0) continue;
      const rate = sensorContribution(s, e);
      if (rate > 0) {
        covered = true;
        const contrib = Math.min(1.0, (e.tq || 0) + rate * dt);
        if (contrib > (e.tqBySensor?.get(s.id) || 0)) {
          if (!e.tqBySensor) e.tqBySensor = new Map();
          e.tqBySensor.set(s.id, contrib);
        }
      }
    }

    for (const t of towers) {
      if (t.kind !== 'hel') continue;
      if (t.hp <= 0) continue;
      const helSensor = TOWERS.hel.integratedSensor;
      const d = dist(t, e);
      if (d <= helSensor.shareRange) {
        covered = true;
        const contrib = Math.min(1.0, (e.tq || 0) + helSensor.tqRate * dt);
        if (!e.tqBySensor) e.tqBySensor = new Map();
        const helKey = `hel_${t.x}_${t.y}`;
        if (contrib > (e.tqBySensor.get(helKey) || 0)) {
          e.tqBySensor.set(helKey, contrib);
        }
      }
    }

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

    if (e.tqBySensor && e.tqBySensor.size > 0) {
      bestTQ = Math.max(...e.tqBySensor.values());
    }

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

    const prevTQ = e.tq || 0;
    e.tq = Math.min(1.0, bestTQ);

    if (prevTQ < 0.25 && e.tq >= 0.25) bus.emit('threat:detected', { enemy: e });
    if (prevTQ >= 0.25 && e.tq < 0.25) bus.emit('threat:lost',     { enemy: e });
  }

  for (const s of sensors) {
    if (s.hp > 0) sensorPowerDraw += (SENSORS[s.kind].powerDraw || 0);
  }

  return sensorPowerDraw;
}

export function getEnemyTQ(enemy) {
  return enemy.tq || 0;
}

export function sensorCanDetectType(sensorKind, threatType) {
  const def = SENSORS[sensorKind];
  const thrDef = ENEMIES[threatType];
  if (def.rfOnly && thrDef.rfSilent) return false;
  if (thrDef.fiber && !def.detectsFiber && !def.detectsAll) return false;
  return true;
}

export function visibilityTier(enemy) {
  const tq = getEnemyTQ(enemy);
  if (tq < 0.10) return 'hidden';
  if (tq < 0.50) return 'uncertain';
  return 'tracked';
}

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

  for (const t of game.towers) {
    if (t.kind !== 'hel' || t.hp <= 0) continue;
    const iSensor = TOWERS.hel.integratedSensor;
    zones.push({
      x: t.x, y: t.y,
      range: iSensor.shareRange,
      coverageAngle: 360,
      facing: 0,
      color: '#ffb347',
      kind: 'hel_eoir',
      jammed: false,
      integrated: true
    });
  }

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
