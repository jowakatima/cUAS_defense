/**
 * SKYSHIELD v2 — Weapon System
 */

import { dist, clamp } from '../engine/math.js';
import { TOWERS, towerStat, samEffectiveRange, samPk } from '../config/weapons.js';
import { ENEMIES } from '../config/threats.js';
import { getEnemyTQ } from './sensor-system.js';
import { bus } from '../engine/event-bus.js';

function towerTargets(tower, enemies, minTQ = 0) {
  return enemies.filter(e => {
    if (e.dead || e.jammed) return false;
    if (getEnemyTQ(e) < minTQ) return false;
    const range = tower.kind === 'sam'
      ? samEffectiveRange(tower, getEnemyTQ(e))
      : towerStat(tower).range;
    return dist(tower, e) <= range;
  });
}

import { BASE } from '../config/levels.js';

function pickTarget(list) {
  let best = null, bd = 1e9;
  for (const e of list) {
    const d = e.path ? (e.plen - e.pd) : dist(e, BASE);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

export function damageEnemy(enemy, amt, game) {
  if (enemy.dead) return;
  enemy.hp -= amt;
  if (enemy.hp <= 0) killEnemy(enemy, false, game);
}

export function killEnemy(enemy, byJam, game) {
  if (enemy.dead) return;
  enemy.dead = true;
  const def = ENEMIES[enemy.type];
  game.score += def.reward * 10;
  game.kills++;
  fxAdd(game, byJam ? 'crash' : 'blast', enemy.x, enemy.y, enemy.r * 2.2, def.color);
  bus.emit('enemy:killed', { enemy, byJam });
}

export function hitBase(enemy, game) {
  const def = ENEMIES[enemy.type];
  game.baseHP -= def.dmg;
  game.shake = Math.min(14, (game.shake || 0) + def.dmg * 0.5);
  fxAdd(game, 'blast', BASE.x, BASE.y, 30, '#ff5252');
  enemy.dead = true;
  bus.emit('enemy:hit-base', { enemy });
  if (game.baseHP <= 0) {
    game.baseHP = 0;
    bus.emit('game:over', { won: false });
  }
}

export function damageTower(tower, attacker, game) {
  const def = ENEMIES[attacker.type];
  tower.hp -= def.dmg * 2;
  game.shake = Math.min(10, (game.shake || 0) + def.dmg * 0.3);
  fxAdd(game, 'blast', tower.x, tower.y, 18, TOWERS[tower.kind].color);
  attacker.dead = true;
  game.score += 20;
  bus.emit('tower:damaged', { tower, attacker, dmg: def.dmg * 2 });
  if (tower.hp <= 0) {
    tower.hp = 0;
    fxAdd(game, 'blast', tower.x, tower.y, 34, '#ff5252');
    fxAdd(game, 'blast', tower.x, tower.y, 22, TOWERS[tower.kind].color);
    game.shake = Math.min(18, (game.shake || 0) + 12);
    game.towers = game.towers.filter(t => t !== tower);
    bus.emit('tower:destroyed', { tower });
  }
}

export function damageSensor(sensor, attacker, game) {
  const def = ENEMIES[attacker.type];
  sensor.hp -= def.dmg * 2;
  attacker.dead = true;
  game.score += 20;
  fxAdd(game, 'blast', sensor.x, sensor.y, 18, '#4dd8ff');
  if (sensor.hp <= 0) {
    sensor.hp = 0;
    fxAdd(game, 'blast', sensor.x, sensor.y, 28, '#ff5252');
    game.shake = Math.min(14, (game.shake || 0) + 8);
    game.sensors = game.sensors.filter(s => s !== sensor);
    bus.emit('tower:destroyed', { tower: sensor });
  }
}

function fxAdd(game, kind, x, y, r, color) {
  game.fx.push({ kind, x, y, r, color,
    life: kind === 'trail' ? 0.35 : kind === 'flash' ? 0.18 : 0.5,
    max:  kind === 'trail' ? 0.35 : kind === 'flash' ? 0.18 : 0.5 });
}

export function updateTower(tower, game, dt) {
  const def = TOWERS[tower.kind];
  const st  = towerStat(tower);
  tower.cool  = Math.max(0, tower.cool - dt);
  tower.anim  = (tower.anim || 0) + dt;

  if (tower.kind === 'sam') {
    updateSAM(tower, st, game, dt);
  } else if (tower.kind === 'ew') {
    updateEW(tower, st, game, dt);
  } else if (tower.kind === 'hel') {
    updateHEL(tower, st, def, game, dt);
  } else if (tower.kind === 'hpm') {
    updateHPM(tower, st, game, dt);
  }
}

function updateSAM(tower, st, game, dt) {
  if (tower.cool > 0 || game.cash < TOWERS.sam.shotCost) return;

  const candidates = towerTargets(tower, game.enemies, 0)
    .filter(e => game.samROE[e.type]);

  const tgt = pickTarget(candidates);
  if (!tgt) return;

  const tq = getEnemyTQ(tgt);
  const effectiveRange = samEffectiveRange(tower, tq);
  if (dist(tower, tgt) > effectiveRange) return;

  const pk = samPk(tower, tq);
  game.cash -= TOWERS.sam.shotCost;
  tower.cool = st.reload;

  game.missiles.push({
    x: tower.x, y: tower.y - 14,
    tgt, spd: 340,
    ang: -Math.PI / 2,
    pk
  });
  fxAdd(game, 'flash', tower.x, tower.y - 14, 10, '#ffdd99');
}

function updateEW(tower, st, game, dt) {
  tower.active = false;
  for (const e of game.enemies) {
    if (e.dead || e.jammed) continue;
    const thrDef = ENEMIES[e.type];
    if (!thrDef.ew) continue;
    if (dist(tower, e) > st.range) continue;
    tower.active = true;
    e.jam += dt * (TOWERS.ew.lv[0].jam / st.jam);
    if (e.jam >= TOWERS.ew.lv[0].jam) { e.jammed = true; e.crash = 0.9; }
  }
}

function updateHEL(tower, def, helDef, game, dt) {
  if (game.power.load > game.power.capacity) return;

  if (tower.tgt && (tower.tgt.dead || tower.tgt.jammed || dist(tower, tower.tgt) > towerStat(tower).range))
    tower.tgt = null;

  if (!tower.tgt) {
    const st = towerStat(tower);
    const inRange = game.enemies.filter(e =>
      !e.dead && !e.jammed && dist(tower, e) <= st.range
    );
    tower.tgt = pickTarget(inRange);
  }

  if (tower.tgt) {
    const st = towerStat(tower);
    const dmg = st.dps * dt;
    tower.firingPower = def.powerDraw;
    damageEnemy(tower.tgt, dmg, game);
    tower.tgt.burn = 0.15;
    if (tower.tgt?.dead) tower.tgt = null;
  } else {
    tower.firingPower = 0;
  }
}

function updateHPM(tower, st, game, dt) {
  if (tower.cool > 0) return;
  if (game.power.load > game.power.capacity) return;

  const list = game.enemies.filter(e =>
    !e.dead && !e.jammed && dist(tower, e) <= st.range
  );
  if (!list.length) return;

  tower.cool  = st.every;
  tower.pulse = 0.45;

  const freqAgile = game.techUnlocks?.hpmFreqAgile || false;

  for (const e of list) {
    let res = ENEMIES[e.type].hpmRes || 0;
    if (freqAgile) res = Math.max(0, res - 0.35);
    damageEnemy(e, st.dmg * (1 - res), game);
  }
}

export function computeWeaponPowerDraw(towers) {
  let load = 0;
  for (const t of towers) {
    if (t.kind === 'hel' && t.tgt && t.hp > 0) load += TOWERS.hel.powerDraw;
    if (t.kind === 'hpm' && t.pulse > 0 && t.hp > 0) load += TOWERS.hpm.powerDraw;
  }
  return load;
}

export function updateSensorJamming(sensors, enemies) {
  for (const s of sensors) {
    s.jammed = false;
    if (!s.jammable) continue;
    const JAM_RADIUS = 180;
    for (const e of enemies) {
      if (e.dead || e.jammed) continue;
      if (!ENEMIES[e.type].ew) continue;
      if (dist(s, e) <= JAM_RADIUS) { s.jammed = true; break; }
    }
  }
}
