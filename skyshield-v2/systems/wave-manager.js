/**
 * SKYSHIELD v2 — Wave Manager
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

export function updateWave(game, dt) {
  game.time += dt;

  while (game.spawnQueue.length && game.spawnQueue[0].t <= game.time) {
    const s = game.spawnQueue.shift();
    game.enemies.push(createEnemy(s.type, s.pi, game.level));
  }

  const weaponPower = computeWeaponPowerDraw(game.towers);
  const sensorPower = updateSensors(game, dt);
  game.power.load = weaponPower + sensorPower;

  updateSensorJamming(game.sensors, game.enemies);

  for (const e of game.enemies) {
    if (!e.dead) updateEnemy(e, game, dt);
  }

  for (const t of game.towers) {
    if (t.hp > 0) updateTower(t, game, dt);
  }

  for (const m of game.missiles) {
    if (!m.dead) updateMissile(m, game, dt);
  }

  for (const t of game.towers) {
    if (t.pulse > 0) t.pulse -= dt;
  }

  for (const e of game.enemies) {
    if (e.burn > 0) e.burn = Math.max(0, e.burn - dt);
  }

  game.missiles = game.missiles.filter(m => !m.dead);
  game.enemies  = game.enemies.filter(e => !e.dead);

  for (const f of game.fx) f.life -= dt;
  game.fx = game.fx.filter(f => f.life > 0);

  if (game.shake > 0) game.shake = Math.max(0, game.shake - 30 * dt);

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
    bus.emit('build:start', { level: game.level, wave: game.wave });
  }
}
