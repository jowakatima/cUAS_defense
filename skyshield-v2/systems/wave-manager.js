/**
 * SKYSHIELD v2 — Wave Manager
 *
 * Drives the wave → build phase flow and level transitions.
 * Emits events for level and wave completion.
 */

import { LEVELS } from '../config/levels.js';
import { buildSpawnQueue, startLevel } from '../engine/game-state.js';
import { createEnemy } from '../entities/enemy.js';
import { updateEnemy } from '../entities/enemy.js';
import { updateTower, computeWeaponPowerDraw, updateSensorJamming } from '../systems/weapon-system.js';
import { updateSensors } from '../systems/sensor-system.js';
import { updateMissile } from '../entities/missile.js';
import { bus } from '../engine/event-bus.js';

export function launchWave(game) {
  buildSpawnQueue(game);
}

/**
 * Main per-frame update while a wave is active.
 * Call once per physics tick (may be called multiple times per frame for speed-up).
 */
export function updateWave(game, dt) {
  game.time += dt;

  // Spawn from queue
  while (game.spawnQueue.length && game.spawnQueue[0].t <= game.time) {
    const s = game.spawnQueue.shift();
    game.enemies.push(createEnemy(s.type, s.pi, game.level));
  }

  // Update power grid load
  const weaponPower = computeWeaponPowerDraw(game.towers);
  const sensorPower = updateSensors(game, dt); // also returns sensor draw
  game.power.load = weaponPower + sensorPower;

  // Update sensor jamming state
  updateSensorJamming(game.sensors, game.enemies);

  // Update enemies
  for (const e of game.enemies) {
    if (!e.dead) updateEnemy(e, game, dt);
  }

  // Update weapon towers
  for (const t of game.towers) {
    if (t.hp > 0) updateTower(t, game, dt);
  }

  // Update missiles
  for (const m of game.missiles) {
    if (!m.dead) updateMissile(m, game, dt);
  }

  // Decay HEL pulse (for HPM pulse ring rendering)
  for (const t of game.towers) {
    if (t.pulse > 0) t.pulse -= dt;
  }

  // Decay enemy burn effect
  for (const e of game.enemies) {
    if (e.burn > 0) e.burn = Math.max(0, e.burn - dt);
  }

  // Cleanup dead entities
  game.missiles = game.missiles.filter(m => !m.dead);
  game.enemies  = game.enemies.filter(e => !e.dead);

  // Decay fx
  for (const f of game.fx) f.life -= dt;
  game.fx = game.fx.filter(f => f.life > 0);

  // Decay screen shake
  if (game.shake > 0) game.shake = Math.max(0, game.shake - 30 * dt);

  // Wave clear check
  if (game.waveActive && !game.spawnQueue.length && !game.enemies.length) {
    waveCleared(game);
  }
}

function waveCleared(game) {
  game.waveActive = false;
  game.score += 250;
  const L = LEVELS[game.level];

  bus.emit('wave:cleared', { level: game.level, wave: game.wave });

  game.wave++;

  if (game.wave >= L.waves.length) {
    // Level complete
    game.score += 1000 + game.baseHP * 10;
    bus.emit('level:complete', { level: game.level });

    if (game.level >= LEVELS.length - 1) {
      game.won = true;
      bus.emit('game:over', { won: true });
    } else {
      startLevel(game, game.level + 1);
      bus.emit('level:start', { level: game.level });
    }
  } else {
    // Next wave — remain in build phase (no mid-wave budget)
    bus.emit('build:start', { level: game.level, wave: game.wave });
  }
}
