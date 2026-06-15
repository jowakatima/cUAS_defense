/**
 * SKYSHIELD v2 — Enemy Entity
 */

import { dist, clamp, pointOnPath, pathLength } from '../engine/math.js';
import { ENEMIES } from '../config/threats.js';
import { BASE, LEVELS } from '../config/levels.js';
import { damageTower, damageSensor, hitBase } from '../systems/weapon-system.js';
import { bus } from '../engine/event-bus.js';

const TOWER_DIVERT_RADIUS = 90;
const TOWER_HIT_RADIUS    = 22;

export function createEnemy(type, pi, level) {
  const def = ENEMIES[type];
  const L   = LEVELS[level];
  const e   = {
    id: `e_${Math.random().toString(36).slice(2)}`,
    type, hp: def.hp, maxhp: def.hp, spd: def.spd, r: def.r,
    jam: 0, jammed: false, dead: false, burn: 0,
    x: 0, y: 0, ang: 0,
    towerTgt: null,
    tgtEval: 0,
    tq: 0,
    tqBySensor: new Map()
  };

  if (L.mode === 'lanes' && pi >= 0) {
    e.path = L.paths[pi];
    e.pd   = 0;
    e.plen = pathLength(e.path);

    const cw = L.corridorWidth || 0;
    e.corridorOff = (Math.random() - 0.5) * cw;

    const dx0 = e.path[1][0] - e.path[0][0];
    const dy0 = e.path[1][1] - e.path[0][1];
    const len0 = Math.hypot(dx0, dy0);
    const px0 = -dy0 / len0, py0 = dx0 / len0;
    const p = pointOnPath(e.path, 0);
    e.x = p.x + px0 * e.corridorOff;
    e.y = p.y + py0 * e.corridorOff;
  } else {
    const a   = Math.random() * Math.PI * 2;
    const rad = 660;
    e.x = BASE.x + Math.cos(a) * rad;
    e.y = BASE.y + Math.sin(a) * rad;
    e.weave    = Math.random() * Math.PI * 2;
    e.weaveAmp = (type === 'swarm' || type === 'aswarm') ? 26 : 10;
  }

  e.sx = e.x; e.sy = e.y;
  return e;
}

export function updateEnemy(e, game, dt) {
  if (e.jammed) {
    e.crash -= dt;
    e.y += 60 * dt;
    e.x += Math.sin(e.crash * 12) * 40 * dt;
    if (e.crash <= 0) {
      e.dead = true;
      game.score += ENEMIES[e.type].reward ?? 0;
      game.fx.push({ kind: 'crash', x: e.x, y: e.y, r: e.r + 6, color: '#888',
        life: 0.5, max: 0.5 });
      bus.emit('enemy:killed', { enemy: e, byJam: true });
    }
    return;
  }

  const def = ENEMIES[e.type];

  e.tgtEval -= dt;
  if (e.tgtEval <= 0) {
    e.tgtEval = 1.2 + Math.random() * 0.8;

    const allEmplacements = [...game.towers, ...game.sensors];
    if (e.towerTgt && !allEmplacements.includes(e.towerTgt)) e.towerTgt = null;

    if (def.towerPrio > 0 && Math.random() < def.towerPrio && allEmplacements.length > 0) {
      let best = null, bd = Infinity;
      for (const t of allEmplacements) {
        const d = dist(e, t);
        if (d < bd) { bd = d; best = t; }
      }
      e.towerTgt = best;
    } else {
      e.towerTgt = null;
    }
  }

  const allEmplacements = [...game.towers, ...game.sensors];
  if (e.towerTgt && !allEmplacements.includes(e.towerTgt)) e.towerTgt = null;

  const spd = e.spd;

  if (e.path) {
    updateLaneEnemy(e, game, dt, spd, def);
  } else {
    update360Enemy(e, game, dt, spd);
  }
}

function updateLaneEnemy(e, game, dt, spd, def) {
  e.pd += spd * dt;

  if (e.pd >= e.plen) {
    if (e.towerTgt && dist(e, e.towerTgt) < 60) {
      applyTgtDamage(e, e.towerTgt, game);
      e.towerTgt = null;
    }
    hitBase(e, game);
    return;
  }

  const p = pointOnPath(e.path, e.pd);
  const prog   = e.pd / e.plen;
  const offNow = (e.corridorOff || 0) * Math.max(0, 1 - prog * prog * 1.6);
  const nx = -Math.sin(p.ang), ny = Math.cos(p.ang);

  if (e.towerTgt && dist(e, e.towerTgt) < TOWER_DIVERT_RADIUS) {
    const tx = e.towerTgt.x - e.x, ty = e.towerTgt.y - e.y;
    const td = Math.hypot(tx, ty);
    if (td < e.r + TOWER_HIT_RADIUS) {
      applyTgtDamage(e, e.towerTgt, game);
      e.towerTgt = null;
      e.pd += spd * dt * 2;
    } else {
      e.x += (tx / td) * spd * dt;
      e.y += (ty / td) * spd * dt;
      e.ang = Math.atan2(ty, tx);
    }
  } else {
    e.x   = p.x + nx * offNow;
    e.y   = p.y + ny * offNow;
    e.ang = p.ang;
  }
}

function update360Enemy(e, game, dt, spd) {
  const aimX = e.towerTgt ? e.towerTgt.x : BASE.x;
  const aimY = e.towerTgt ? e.towerTgt.y : BASE.y;
  const dx = aimX - e.x, dy = aimY - e.y, d = Math.hypot(dx, dy);
  const hitR = e.towerTgt ? (e.r + TOWER_HIT_RADIUS) : (BASE.r + e.r);

  if (d < hitR) {
    if (e.towerTgt) {
      applyTgtDamage(e, e.towerTgt, game);
      e.towerTgt = null;
    } else {
      hitBase(e, game);
      return;
    }
  }

  e.weave += dt * 3;
  const wx = -dy / d, wy = dx / d;
  const wob = Math.sin(e.weave) * (e.weaveAmp || 0) * 0.04;
  e.x  += (dx / d + wx * wob) * spd * dt;
  e.y  += (dy / d + wy * wob) * spd * dt;
  e.ang = Math.atan2(dy, dx);
}

function applyTgtDamage(e, tgt, game) {
  if (game.sensors.includes(tgt)) {
    damageSensor(tgt, e, game);
  } else {
    damageTower(tgt, e, game);
  }
}
