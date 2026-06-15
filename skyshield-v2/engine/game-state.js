/**
 * SKYSHIELD v2 — Authoritative Game State
 */

import { LEVELS } from '../config/levels.js';
import { defaultTechUnlocks } from '../config/tech-tree.js';

export function newGame() {
  return {
    level:  0,
    wave:   0,
    cash:   0,
    baseHP: 100,
    score:  0,
    kills:  0,
    won:    false,

    towers:  [],
    sensors: [],
    techUnlocks: defaultTechUnlocks(),

    enemies:    [],
    missiles:   [],
    fx:         [],
    spawnQueue: [],
    waveActive: false,
    time:       0,

    power: {
      capacity: 400,
      load: 0
    },

    samROE: {
      quad:   true,
      fpv:    true,
      wing:   true,
      auto:   true,
      fiber:  true,
      swarm:  false,
      aswarm: false,
      loiter: true,
      cruise: true
    }
  };
}

export function startLevel(game, li) {
  const L = LEVELS[li];
  game.level      = li;
  game.wave       = 0;
  game.cash      += L.grant;
  game.enemies    = [];
  game.missiles   = [];
  game.fx         = [];
  game.spawnQueue = [];
  game.waveActive = false;
  game.time       = 0;
}

export function buildSpawnQueue(game) {
  const L = LEVELS[game.level];
  const wv = L.waves[game.wave];
  const q = [];
  for (const [type, count, gap, delay, pi] of wv) {
    for (let i = 0; i < count; i++) {
      q.push({ t: delay + i * gap, type, pi });
    }
  }
  q.sort((a, b) => a.t - b.t);
  game.spawnQueue = q;
  game.time = 0;
  game.waveActive = true;
}

export function unlockedWeapons(game) {
  const s = new Set();
  for (let i = 0; i <= game.level; i++)
    for (const k of (LEVELS[i].weaponUnlocks || [])) s.add(k);
  return s;
}

export function unlockedSensors(game) {
  const s = new Set();
  for (let i = 0; i <= game.level; i++)
    for (const k of (LEVELS[i].sensorUnlocks || [])) s.add(k);
  return s;
}

export function unlockLevelOf(kind, type = 'weapon') {
  const key = type === 'weapon' ? 'weaponUnlocks' : 'sensorUnlocks';
  for (let i = 0; i < LEVELS.length; i++)
    if ((LEVELS[i][key] || []).includes(kind)) return i + 1;
  return 1;
}
