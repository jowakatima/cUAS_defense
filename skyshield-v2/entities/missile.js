/**
 * SKYSHIELD v2 — Missile Entity
 *
 * SAM interceptor guidance. Retargets if original target is destroyed or jammed.
 * Pk roll on impact: missile carries the Pk from weapon-system at launch time.
 */

import { dist, clamp, wrapAngle } from '../engine/math.js';
import { damageEnemy } from '../systems/weapon-system.js';

export function updateMissile(m, game, dt) {
  // Retarget if primary is gone
  if (m.tgt.dead || m.tgt.jammed) {
    let best = null, bd = 1e9;
    for (const e of game.enemies) {
      if (!e.dead && !e.jammed) {
        const d = dist(m, e);
        if (d < bd) { bd = d; best = e; }
      }
    }
    if (!best) {
      m.dead = true;
      fxAdd(game, 'flash', m.x, m.y, 8, '#ffdd99');
      return;
    }
    m.tgt = best;
    // Pk stays at launch value — no second roll
  }

  const dx   = m.tgt.x - m.x, dy = m.tgt.y - m.y, d = Math.hypot(dx, dy);
  const want  = Math.atan2(dy, dx);
  m.ang       = m.ang + clamp(wrapAngle(want - m.ang), -4.2 * dt, 4.2 * dt);
  m.spd       = Math.min(520, m.spd + 420 * dt);
  m.x        += Math.cos(m.ang) * m.spd * dt;
  m.y        += Math.sin(m.ang) * m.spd * dt;

  if (Math.random() < 0.6) fxAdd(game, 'trail', m.x, m.y, 2.5, '#ffcf8a');

  if (d < m.tgt.r + 8) {
    // Pk roll: probabilistic kill
    if (Math.random() < (m.pk ?? 1.0)) {
      damageEnemy(m.tgt, 500, game); // one-shot damage
    }
    fxAdd(game, 'blast', m.x, m.y, 22, '#ffb347');
    m.dead = true;
  }
}

function fxAdd(game, kind, x, y, r, color) {
  game.fx.push({ kind, x, y, r, color,
    life: kind === 'trail' ? 0.35 : kind === 'flash' ? 0.18 : 0.5,
    max:  kind === 'trail' ? 0.35 : kind === 'flash' ? 0.18 : 0.5 });
}
