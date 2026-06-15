/**
 * SKYSHIELD v2 — Main Entry Point
 *
 * DEPLOYMENT: Works on GitHub Pages out of the box — all imports are relative paths,
 * no build step required. Push to repo; Pages serves it at /skyshield-v2/.
 * Local dev: `python3 -m http.server 8080` (ES modules don't load via file:// directly).
 */

import { newGame, startLevel, unlockedWeapons, unlockedSensors, unlockLevelOf, buildSpawnQueue } from './engine/game-state.js';
import { updateWave, launchWave } from './systems/wave-manager.js';
import { bus } from './engine/event-bus.js';
import { LEVELS, BASE } from './config/levels.js';
import { TOWERS, SELL_RATIO, towerStat } from './config/weapons.js';
import { SENSORS } from './config/sensors.js';
import { ENEMIES } from './config/threats.js';
import { dist, clamp, distToPath } from './engine/math.js';
import { getEnemyTQ, visibilityTier } from './systems/sensor-system.js';
import { drawCoverageOverlay, drawSensorIcon } from './ui/coverage-overlay.js';

const cv  = document.getElementById('cv');
const ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;
const HUD_H  = 64;
const TOOL_H = 96;
const FIELD  = { x: 0, y: HUD_H, w: W, h: H - HUD_H - TOOL_H };

let game     = null;
let phase    = 'menu';
let mouse    = { x: 0, y: 0, inField: false };
let placing  = null;
let selected = null;
let roeOpen  = false;
let speedMult = 1;
let sweepAng  = 0;
let uiButtons = [];
let toolTab   = 'weapons';
let showCoverageOverlay = true;

function fitCanvas() {
  const pad = 16;
  const s = Math.min((window.innerWidth - pad) / W, (window.innerHeight - pad) / H, 1.25);
  cv.style.width  = (W * s) + 'px';
  cv.style.height = (H * s) + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const SCREENS = ['menuScreen','helpScreen','lbScreen','briefScreen','overScreen'];
function showScreen(id) {
  SCREENS.forEach(s => document.getElementById(s).classList.toggle('hidden', s !== id));
}
function hideAll() {
  SCREENS.forEach(s => document.getElementById(s).classList.add('hidden'));
}

function beginGame() {
  game = newGame();
  startLevel(game, 0);
  bus.clear();
  wireEvents();
  showBriefing();
}

function showBriefing() {
  const L = LEVELS[game.level];
  document.getElementById('briefTitle').textContent = L.name;
  let unlockNote = '';
  if ((L.weaponUnlocks || []).length || (L.sensorUnlocks || []).length) {
    const names = [
      ...(L.weaponUnlocks || []).map(k => TOWERS[k].name),
      ...(L.sensorUnlocks || []).map(k => SENSORS[k].name)
    ].join(', ');
    unlockNote = `<div class="unlock-note">★ NEW SYSTEMS AUTHORIZED: <b>${names}</b></div>`;
  }
  document.getElementById('briefText').innerHTML =
    `<div class="threat-header">// THREAT BRIEFING — ${
      L.mode === 'lanes' ? 'KNOWN INGRESS CORRIDORS' : '360° ATTACK AXES'
    }</div>` + L.brief + unlockNote +
    `<div class="budget-note">BUDGET SUPPLEMENT: <b>+$${L.grant}</b> (TOTAL $${game.cash}) · WAVES: ${L.waves.length}${
      game.level > 0 ? ' · EMPLACEMENTS CARRY OVER' : ''
    }</div>`;
  showScreen('briefScreen');
  phase = 'brief';
}

function wireEvents() {
  bus.on('level:start', () => showBriefing());
  bus.on('build:start', () => { phase = 'build'; });
  bus.on('game:over',   ({ won }) => endRun(won));
}

function endRun(won) {
  game.won = won;
  phase = 'over';
  document.getElementById('overTitle').textContent    = won ? 'BASE SECURED' : 'BASE DESTROYED';
  document.getElementById('overTitle').style.color    = won ? 'var(--green)' : 'var(--red)';
  document.getElementById('overSub').textContent      = won
    ? 'All threat waves neutralized across every sector. Outstanding, Commander.'
    : `Base integrity lost at ${LEVELS[game.level].name}, wave ${game.wave + 1}.`;
  document.getElementById('finalScore').textContent   = game.score.toLocaleString();
  document.getElementById('nameEntry').style.display  = 'block';
  document.getElementById('postSubmit').style.display = 'none';
  document.getElementById('nameInput').value          = localStorage.getItem('ss_callsign') || '';
  showScreen('overScreen');
}

function canPlace(x, y) {
  if (y < FIELD.y + 20 || y > FIELD.y + FIELD.h - 14 || x < 14 || x > W - 14) return false;
  if (Math.hypot(x - BASE.x, y - BASE.y) < BASE.r + 30) return false;
  const allObjs = [...game.towers, ...game.sensors];
  for (const t of allObjs) if (Math.hypot(t.x - x, t.y - y) < 36) return false;
  const L = LEVELS[game.level];
  if (L.mode === 'lanes') for (const p of L.paths) if (distToPath({ x, y }, p) < 26) return false;
  return true;
}

function towerAt(x, y) {
  for (const t of game.towers) if (Math.hypot(t.x - x, t.y - y) < 18) return { category: 'weapon', obj: t };
  for (const s of game.sensors) if (Math.hypot(s.x - x, s.y - y) < 18) return { category: 'sensor', obj: s };
  return null;
}

function placeTower(x, y) {
  const { category, kind } = placing;
  if (category === 'weapon') {
    const def = TOWERS[kind];
    if (game.cash < def.cost || !canPlace(x, y)) return;
    const t = {
      kind, x, y, cool: 0, range: def.lv[0].range,
      lvl: 1, invested: def.cost, tgt: null, pulse: 0, anim: 0,
      hp: def.hp, maxHP: def.hp, active: false, jammed: false
    };
    if (kind === 'hpm' && game._hpmIntegrated) {
      t.integratedSensor = { ...TOWERS.hpm.integratedSensorUpgrade.sensor };
    }
    game.towers.push(t);
    game.cash -= def.cost + (t.integratedSensor ? TOWERS.hpm.integratedSensorUpgrade.extraCost : 0);
    addFx(game, 'flash', x, y, 14, def.color);
    if (game.cash < def.cost) placing = null;
  } else {
    const def = SENSORS[kind];
    if (game.cash < def.cost || !canPlace(x, y)) return;
    const s = {
      kind, x, y, range: def.range, lvl: 1, invested: def.cost,
      hp: def.hp, maxHP: def.hp, facing: 0, jammed: false, active: false, anim: 0
    };
    game.sensors.push(s);
    game.cash -= def.cost;
    addFx(game, 'flash', x, y, 14, def.color);
    if (game.cash < def.cost) placing = null;
  }
}

function addFx(game, kind, x, y, r, color) {
  game.fx.push({ kind, x, y, r, color,
    life: kind === 'trail' ? 0.35 : kind === 'flash' ? 0.18 : 0.5,
    max:  kind === 'trail' ? 0.35 : kind === 'flash' ? 0.18 : 0.5 });
}

function canvasPos(ev) {
  const r = cv.getBoundingClientRect();
  return { x: (ev.clientX - r.left) * (W / r.width), y: (ev.clientY - r.top) * (H / r.height) };
}

cv.addEventListener('mousemove', ev => {
  const p = canvasPos(ev);
  mouse.x = p.x; mouse.y = p.y;
  mouse.inField = p.y > FIELD.y && p.y < FIELD.y + FIELD.h;
});

cv.addEventListener('contextmenu', ev => { ev.preventDefault(); placing = null; selected = null; });

cv.addEventListener('click', ev => {
  if (phase !== 'build' && phase !== 'wave') return;
  const p = canvasPos(ev);
  for (let i = uiButtons.length - 1; i >= 0; i--) {
    const b = uiButtons[i];
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
      if (!b.disabled) handleButton(b.id);
      return;
    }
  }
  if (p.y <= FIELD.y || p.y >= FIELD.y + FIELD.h) return;
  if (placing) { placeTower(p.x, p.y); return; }
  const hit = towerAt(p.x, p.y);
  selected = hit;
});

window.addEventListener('keydown', ev => {
  if (phase !== 'build' && phase !== 'wave') return;
  if (document.activeElement?.tagName === 'INPUT') return;
  const weaponMap = { '1': 'sam', '2': 'ew', '3': 'hel', '4': 'hpm' };
  if (weaponMap[ev.key] && unlockedWeapons(game).has(weaponMap[ev.key])) {
    placing = placing?.kind === weaponMap[ev.key] ? null : { category: 'weapon', kind: weaponMap[ev.key] };
    selected = null;
  } else if (ev.key === 'Escape') { placing = null; selected = null; roeOpen = false; }
  else if (ev.key === ' ') { ev.preventDefault(); if (phase === 'build') { launchWave(game); phase = 'wave'; } }
  else if (ev.key === 'c' || ev.key === 'C') { showCoverageOverlay = !showCoverageOverlay; }
  else if (ev.key === 'Tab') { ev.preventDefault(); toolTab = toolTab === 'weapons' ? 'sensors' : 'weapons'; }
});

function handleButton(id) {
  if (id === 'speed')   { speedMult = speedMult === 1 ? 2 : speedMult === 2 ? 3 : 1; }
  else if (id === 'wave' && phase === 'build') { launchWave(game); phase = 'wave'; }
  else if (id === 'roe') { roeOpen = !roeOpen; }
  else if (id === 'coverage') { showCoverageOverlay = !showCoverageOverlay; }
  else if (id === 'tab:weapons') { toolTab = 'weapons'; }
  else if (id === 'tab:sensors') { toolTab = 'sensors'; }
  else if (id.startsWith('roe:')) { const k = id.slice(4); game.samROE[k] = !game.samROE[k]; }
  else if (id === 'upgrade' && selected) {
    const { category, obj } = selected;
    const def = category === 'weapon' ? TOWERS[obj.kind] : SENSORS[obj.kind];
    if (obj.lvl < 3) {
      const cost = def.upCost[obj.lvl - 1];
      if (game.cash >= cost) {
        game.cash -= cost; obj.lvl++; obj.invested += cost;
        if (category === 'weapon') obj.range = towerStat(obj).range;
        addFx(game, 'flash', obj.x, obj.y, 16, def.color);
      }
    }
  }
  else if (id === 'sell' && selected) {
    const { category, obj } = selected;
    game.cash += Math.round(obj.invested * SELL_RATIO);
    if (category === 'weapon') game.towers  = game.towers.filter(t => t !== obj);
    else                       game.sensors = game.sensors.filter(s => s !== obj);
    selected = null;
  }
  else if (id === 'close') { selected = null; }
  else if (id.startsWith('weapon:')) {
    const k = id.slice(7);
    if (!unlockedWeapons(game).has(k)) return;
    placing = (placing?.kind === k) ? null : { category: 'weapon', kind: k };
    selected = null;
  }
  else if (id.startsWith('sensor:')) {
    const k = id.slice(7);
    if (!unlockedSensors(game).has(k)) return;
    placing = (placing?.kind === k) ? null : { category: 'sensor', kind: k };
    selected = null;
  }
}

let last = performance.now();

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (phase === 'wave') {
    for (let i = 0; i < speedMult; i++) updateWave(game, dt);
  }

  render(dt);
  requestAnimationFrame(loop);
}

function render(dt) {
  uiButtons = [];
  ctx.save();
  ctx.clearRect(0, 0, W, H);

  if (game?.shake > 0) {
    ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  }

  drawField(dt);

  if (game) {
    drawCoverageOverlay(ctx, game, showCoverageOverlay);
    drawPaths();
    drawSensors();
    drawTowers();
    drawEnemies();
    drawMissiles();
    drawFx();
    drawBase();
    drawGhost();
  }

  ctx.restore();
  drawHUD();
  drawToolbar();
  drawROE();
  if (selected) drawInspect();
}

function drawField(dt) {
  ctx.fillStyle = '#04130b';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(57,255,142,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, FIELD.y); ctx.lineTo(x, FIELD.y + FIELD.h); ctx.stroke(); }
  for (let y = FIELD.y; y < FIELD.y + FIELD.h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  if (!game) return;
  ctx.strokeStyle = 'rgba(57,255,142,0.10)';
  for (let r = 90; r <= 450; r += 90) { ctx.beginPath(); ctx.arc(BASE.x, BASE.y, r, 0, Math.PI * 2); ctx.stroke(); }
  sweepAng += dt * 0.8;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, FIELD.y, W, FIELD.h); ctx.clip();
  ctx.beginPath(); ctx.moveTo(BASE.x, BASE.y);
  ctx.arc(BASE.x, BASE.y, 460, sweepAng - 0.5, sweepAng);
  ctx.closePath();
  const grad = ctx.createRadialGradient(BASE.x, BASE.y, 0, BASE.x, BASE.y, 460);
  grad.addColorStop(0, 'rgba(57,255,142,0.10)');
  grad.addColorStop(1, 'rgba(57,255,142,0.00)');
  ctx.fillStyle = grad; ctx.fill();
  ctx.restore();
}

function drawPaths() {
  const L = LEVELS[game.level];
  if (L.mode !== 'lanes') return;
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = 'rgba(255,82,82,0.35)';
  ctx.lineWidth = 2;
  for (const p of L.paths) {
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
    ctx.stroke();
    ctx.save();
    const a = Math.atan2(p[1][1] - p[0][1], p[1][0] - p[0][0]);
    ctx.translate(p[0][0], p[0][1]); ctx.rotate(a);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,82,82,0.6)';
    ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(10, -7); ctx.lineTo(10, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawSensors() {
  for (const s of game.sensors) {
    const def = SENSORS[s.kind];
    const isSelected = selected?.obj === s;
    if (isSelected || Math.hypot(mouse.x - s.x, mouse.y - s.y) < 18) {
      ctx.strokeStyle = def.color; ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.range, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle   = 'rgba(10,25,18,0.9)';
    ctx.strokeStyle = s.jammed ? 'rgba(255,82,82,0.6)' : `rgba(${hexToRgb(def.color)},0.35)`;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.beginPath();
    ctx.rect(s.x - 14, s.y - 14, 28, 28);
    ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1.6;

    drawSensorIcon(ctx, s.kind, s.x, s.y);

    if (s.hp < s.maxHP) {
      const pct = s.hp / s.maxHP;
      ctx.fillStyle = '#142a1c'; ctx.fillRect(s.x - 14, s.y + 16, 28, 4);
      ctx.fillStyle = pct > 0.5 ? '#39ff8e' : pct > 0.25 ? '#ffb347' : '#ff5252';
      ctx.fillRect(s.x - 14, s.y + 16, 28 * pct, 4);
    }
    if (s.jammed) {
      ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x - 6, s.y - 6); ctx.lineTo(s.x + 6, s.y + 6);
      ctx.moveTo(s.x + 6, s.y - 6); ctx.lineTo(s.x - 6, s.y + 6);
      ctx.stroke();
    }
  }
}

function drawTowers() {
  for (const t of game.towers) {
    const def = TOWERS[t.kind];
    const isSelected = selected?.obj === t;
    if (isSelected || Math.hypot(mouse.x - t.x, mouse.y - t.y) < 18) {
      ctx.strokeStyle = def.color; ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = 'rgba(10,30,20,0.9)';
    ctx.strokeStyle = 'rgba(57,255,142,0.25)';
    ctx.beginPath(); ctx.arc(t.x, t.y, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    drawTowerIcon(t, t.kind, t.x, t.y, t.active);

    if (t.kind === 'hel' && t.tgt && !t.tgt.dead) {
      ctx.save();
      ctx.strokeStyle = '#7dffb6'; ctx.lineWidth = 2 + Math.random() * 1.5;
      ctx.shadowColor = '#39ff8e'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(t.x, t.y - 4); ctx.lineTo(t.tgt.x, t.tgt.y); ctx.stroke();
      ctx.restore();
    }
    if (t.pulse > 0) {
      const p = 1 - t.pulse / 0.45;
      ctx.strokeStyle = def.color; ctx.globalAlpha = (1 - p) * 0.8; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(t.x, t.y, p * t.range, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 1.6;
    }
    if (t.kind === 'ew' && t.active) {
      ctx.strokeStyle = def.color; ctx.globalAlpha = 0.12 + 0.06 * Math.sin((t.anim || 0) * 6);
      ctx.beginPath(); ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (t.kind === 'sam' && t.cool > 0) {
      const pct = 1 - t.cool / towerStat(t).reload;
      ctx.fillStyle = '#142a1c'; ctx.fillRect(t.x - 12, t.y + 18, 24, 3);
      ctx.fillStyle = '#ff5252'; ctx.fillRect(t.x - 12, t.y + 18, 24 * pct, 3);
    }
    if (t.hp < t.maxHP) {
      const hpPct = t.hp / t.maxHP;
      ctx.fillStyle = '#142a1c'; ctx.fillRect(t.x - 14, t.y + 22, 28, 4);
      ctx.fillStyle = hpPct > 0.5 ? '#39ff8e' : hpPct > 0.25 ? '#ffb347' : '#ff5252';
      ctx.fillRect(t.x - 14, t.y + 22, 28 * hpPct, 4);
      if (hpPct < 0.25) {
        ctx.globalAlpha = 0.3 + 0.3 * Math.sin((t.anim || 0) * 10);
        ctx.fillStyle = '#ff5252'; ctx.fillRect(t.x - 16, t.y - 16, 32, 32);
        ctx.globalAlpha = 1;
      }
    }
    if (t.kind === 'hel') {
      const iSensor = TOWERS.hel.integratedSensor;
      ctx.strokeStyle = 'rgba(255,179,71,0.18)'; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(t.x, t.y, iSensor.shareRange, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (t.lvl > 1) {
      ctx.fillStyle = def.color;
      for (let i = 0; i < t.lvl; i++) ctx.fillRect(t.x - 8 + i * 6, t.y - 24, 4, 4);
    }
  }
}

function drawTowerIcon(t, kind, x, y, active) {
  const def = TOWERS[kind];
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = def.color; ctx.fillStyle = def.color; ctx.lineWidth = 1.6;
  if (kind === 'sam') {
    ctx.strokeRect(-11, -9, 22, 18);
    for (const [sx, sy] of [[-6,-2],[0,-2],[6,-2]]) {
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.5); ctx.fillRect(-1.5,-8,3,12); ctx.restore();
    }
  } else if (kind === 'ew') {
    ctx.beginPath(); ctx.moveTo(0,-13); ctx.lineTo(10,8); ctx.lineTo(-10,8); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-13); ctx.lineTo(0,2); ctx.stroke();
    if (active && t) {
      const ph = ((t.anim||0)*2)%1;
      ctx.globalAlpha=1-ph;
      ctx.beginPath(); ctx.arc(0,-13,6+ph*16,-2.4,-0.7); ctx.stroke();
      ctx.globalAlpha=1;
    }
  } else if (kind === 'hel') {
    ctx.beginPath(); ctx.arc(0,0,11,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,-11); ctx.lineTo(0,-17); ctx.stroke();
    ctx.fillStyle='#ffb347'; ctx.beginPath(); ctx.arc(8,-8,2.5,0,Math.PI*2); ctx.fill();
  } else if (kind === 'hpm') {
    ctx.strokeRect(-10,-10,20,20);
    ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,8,-1.2,1.2); ctx.stroke();
  }
  ctx.restore();
}

function drawEnemies() {
  for (const e of game.enemies) {
    if (ENEMIES[e.type].fiber && !e.jammed) {
      ctx.strokeStyle = 'rgba(255,140,66,0.30)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(e.sx, e.sy);
      const mx = (e.sx + e.x) / 2, my = (e.sy + e.y) / 2 + 14;
      ctx.quadraticCurveTo(mx, my, e.x, e.y); ctx.stroke();
    }
  }

  for (const e of game.enemies) {
    const def  = ENEMIES[e.type];
    const tier = visibilityTier(e);
    if (tier === 'hidden') continue;

    ctx.save(); ctx.translate(e.x, e.y);
    let col = def.color;
    if (tier === 'uncertain') { ctx.globalAlpha = 0.35; col = '#888'; }
    if (e.jammed) { ctx.globalAlpha = 0.7; col = '#888'; ctx.rotate(e.crash * 10); }
    else ctx.rotate(e.ang + Math.PI / 2);
    if (e.burn > 0) { ctx.shadowColor = '#39ff8e'; ctx.shadowBlur = 10; }
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.5;
    const r = e.r;

    if (tier === 'uncertain') {
      ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
      ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    } else {
      drawEnemyShape(def.shape, r, ctx);
    }

    ctx.restore();

    if (!def.ew && !e.jammed && tier === 'tracked') {
      ctx.save(); ctx.translate(e.x, e.y - e.r - 9);
      ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(4,0); ctx.lineTo(0,4); ctx.lineTo(-4,0); ctx.closePath(); ctx.stroke();
      ctx.restore();
    }

    if (tier !== 'hidden') {
      const tq = getEnemyTQ(e);
      if (tq > 0.1) {
        const tqColor = tq >= 0.5 ? '#39ff8e' : '#ffb347';
        ctx.strokeStyle = tqColor; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5, -Math.PI / 2, -Math.PI / 2 + tq * Math.PI * 2); ctx.stroke();
      }
    }

    if (e.jam > 0 && !e.jammed) {
      ctx.strokeStyle = '#4dd8ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5, -Math.PI / 2, -Math.PI / 2 + (e.jam / TOWERS.ew.lv[0].jam) * Math.PI * 2); ctx.stroke();
    }

    if (e.hp < e.maxhp && e.maxhp >= 50 && !e.jammed && tier === 'tracked') {
      ctx.fillStyle = '#142a1c'; ctx.fillRect(e.x - 12, e.y - e.r - 9, 24, 3);
      ctx.fillStyle = '#ffb347'; ctx.fillRect(e.x - 12, e.y - e.r - 9, 24 * (e.hp / e.maxhp), 3);
    }
  }
}

function drawEnemyShape(shape, r, ctx) {
  if (shape === 'quad') {
    ctx.beginPath(); ctx.moveTo(-r,-r); ctx.lineTo(r,r); ctx.moveTo(r,-r); ctx.lineTo(-r,r); ctx.stroke();
    for (const [sx,sy] of [[-r,-r],[r,-r],[-r,r],[r,r]]) {
      ctx.beginPath(); ctx.arc(sx,sy,r*0.45,0,Math.PI*2); ctx.stroke();
    }
    ctx.fillRect(-1.5,-1.5,3,3);
  } else if (shape === 'dot') {
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
  } else if (shape === 'wing') {
    ctx.beginPath(); ctx.moveTo(0,-r*1.2); ctx.lineTo(r,r*0.5); ctx.lineTo(0,r*0.1); ctx.lineTo(-r,r*0.5); ctx.closePath(); ctx.stroke();
  } else if (shape === 'delta') {
    ctx.beginPath(); ctx.moveTo(0,-r*1.3); ctx.lineTo(r*0.9,r); ctx.lineTo(-r*0.9,r); ctx.closePath(); ctx.fill();
  } else if (shape === 'missile') {
    ctx.beginPath(); ctx.moveTo(0,-r*1.6); ctx.lineTo(r*0.5,r); ctx.lineTo(-r*0.5,r); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,179,71,0.8)';
    ctx.beginPath(); ctx.moveTo(0,r+2+Math.random()*5); ctx.lineTo(r*0.3,r); ctx.lineTo(-r*0.3,r); ctx.closePath(); ctx.fill();
  }
}

function drawMissiles() {
  for (const m of game.missiles) {
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.ang + Math.PI / 2);
    ctx.fillStyle = '#ffeecc';
    ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(3,5); ctx.lineTo(-3,5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function drawFx() {
  for (const f of game.fx) {
    const p = f.life / f.max;
    ctx.globalAlpha = p;
    if (f.kind === 'blast') {
      ctx.strokeStyle = f.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r*(1.4-p), 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = f.color; ctx.globalAlpha = p*0.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r*0.5*p, 0, Math.PI*2); ctx.fill();
    } else if (f.kind === 'crash') {
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r*(1.2-p), 0, Math.PI*2); ctx.stroke();
    } else {
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r*p, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawBase() {
  ctx.save(); ctx.translate(BASE.x, BASE.y);
  ctx.strokeStyle = '#39ff8e'; ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(57,255,142,0.08)';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI/6 + i*Math.PI/3;
    const px = Math.cos(a)*BASE.r, py = Math.sin(a)*BASE.r;
    i ? ctx.lineTo(px,py) : ctx.moveTo(px,py);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#39ff8e'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
  ctx.fillText('BASE', 0, -4);
  const w = 56, pct = game.baseHP / 100;
  ctx.fillStyle = '#142a1c'; ctx.fillRect(-w/2, 10, w, 6);
  ctx.fillStyle = pct > 0.5 ? '#39ff8e' : pct > 0.25 ? '#ffb347' : '#ff5252';
  ctx.fillRect(-w/2, 10, w*pct, 6);
  ctx.restore();
}

function drawGhost() {
  if (!placing || !mouse.inField) return;
  const { category, kind } = placing;
  const def = category === 'weapon' ? TOWERS[kind] : SENSORS[kind];
  const range = category === 'weapon' ? def.lv[0].range : def.range;
  const ok = canPlace(mouse.x, mouse.y) && game.cash >= def.cost;
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = ok ? def.color : '#ff5252';
  ctx.beginPath(); ctx.arc(mouse.x, mouse.y, range, 0, Math.PI * 2); ctx.stroke();
  if (category === 'weapon') drawTowerIcon(null, kind, mouse.x, mouse.y, false);
  else drawSensorIcon(ctx, kind, mouse.x, mouse.y);
  if (!ok) {
    ctx.strokeStyle = '#ff5252'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mouse.x-10,mouse.y-10); ctx.lineTo(mouse.x+10,mouse.y+10);
    ctx.moveTo(mouse.x+10,mouse.y-10); ctx.lineTo(mouse.x-10,mouse.y+10);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function btn(x, y, w, h, label, id, color, disabled) {
  uiButtons.push({ x, y, w, h, id, disabled });
  const hov = mouse.x >= x && mouse.x <= x+w && mouse.y >= y && mouse.y <= y+h;
  ctx.strokeStyle = color; ctx.globalAlpha = disabled ? 0.3 : 1;
  if (hov && !disabled) { ctx.fillStyle = 'rgba(57,255,142,0.12)'; ctx.fillRect(x,y,w,h); }
  ctx.strokeRect(x,y,w,h);
  ctx.fillStyle = color; ctx.font = '12px monospace'; ctx.textAlign = 'center';
  ctx.fillText(label, x+w/2, y+h/2+4);
  ctx.globalAlpha = 1;
}

function drawHUD() {
  ctx.fillStyle = '#081410'; ctx.fillRect(0,0,W,HUD_H);
  ctx.strokeStyle = '#1d3a2a';
  ctx.beginPath(); ctx.moveTo(0,HUD_H); ctx.lineTo(W,HUD_H); ctx.stroke();
  if (!game) return;
  const L = LEVELS[game.level];
  ctx.textAlign = 'left'; ctx.font = '13px monospace';
  ctx.fillStyle = '#39ff8e';
  ctx.fillText(L.name, 16, 25);
  ctx.fillStyle = '#1f7a4d'; ctx.font = '11px monospace';
  ctx.fillText(`WAVE ${Math.min(game.wave+1,L.waves.length)}/${L.waves.length}   // ${L.mode==='lanes'?'CORRIDOR INGRESS':'360° ATTACK AXES'}`, 16, 44);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#ffb347'; ctx.fillText(`FUNDS $${game.cash}`, 380, 25);
  ctx.fillStyle = '#b8e6c9'; ctx.fillText(`SCORE ${game.score.toLocaleString()}`, 380, 46);
  const load = game.power.load, cap = game.power.capacity;
  const pwr = clamp(load/cap, 0, 1);
  ctx.fillStyle = '#b8e6c9'; ctx.fillText('POWER', 520, 25);
  ctx.fillStyle = '#142a1c'; ctx.fillRect(520, 32, 90, 8);
  ctx.fillStyle = pwr < 0.7 ? '#39ff8e' : pwr < 0.9 ? '#ffb347' : '#ff5252';
  ctx.fillRect(520, 32, 90*pwr, 8);
  ctx.fillStyle = '#b8e6c9'; ctx.font = '10px monospace';
  ctx.fillText(`${Math.round(load)}/${cap}kW`, 615, 39);
  ctx.fillStyle = '#b8e6c9'; ctx.font = '13px monospace'; ctx.fillText('BASE', 650, 25);
  const bpct = game.baseHP/100;
  ctx.fillStyle = '#142a1c'; ctx.fillRect(650, 32, 120, 8);
  ctx.fillStyle = bpct > 0.5 ? '#39ff8e' : bpct > 0.25 ? '#ffb347' : '#ff5252';
  ctx.fillRect(650, 32, 120*bpct, 8);
  ctx.fillStyle = '#b8e6c9'; ctx.font = '11px monospace'; ctx.fillText(`${game.baseHP}%`, 775, 40);

  btn(W-90, 14, 74, 36, `SPEED x${speedMult}`, 'speed', '#4dd8ff', false);
  btn(W-188, 14, 88, 36, 'SAM ROE', 'roe', roeOpen ? '#ffb347' : '#ff5252', false);
  btn(W-290, 14, 92, 36, showCoverageOverlay ? 'SENSOR [C]' : 'SENSOR OFF', 'coverage', '#ffb347', false);

  if (phase === 'build') {
    const t = (Math.sin(performance.now()/300)+1)/2;
    ctx.save(); ctx.shadowColor='#ffb347'; ctx.shadowBlur=6+t*8;
    btn(W-470, 14, 168, 36, `▶ LAUNCH WAVE ${game.wave+1}`, 'wave', '#ffb347', false);
    ctx.restore();
  } else {
    ctx.fillStyle='#1f7a4d'; ctx.font='11px monospace'; ctx.textAlign='right';
    ctx.fillText(`HOSTILES: ${game.enemies.length+game.spawnQueue.length}`, W-310, 36);
  }
}

function drawToolbar() {
  const y0 = H - TOOL_H;
  ctx.fillStyle = '#081410'; ctx.fillRect(0, y0, W, TOOL_H);
  ctx.strokeStyle = '#1d3a2a';
  ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
  if (!game) return;

  btn(16, y0+4, 90, 22, 'WEAPONS', 'tab:weapons', toolTab==='weapons'?'#39ff8e':'#1f7a4d', false);
  btn(110, y0+4, 90, 22, 'SENSORS', 'tab:sensors', toolTab==='sensors'?'#4dd8ff':'#1f7a4d', false);

  if (toolTab === 'weapons') {
    drawWeaponCards(y0);
  } else {
    drawSensorCards(y0);
  }
}

function drawWeaponCards(y0) {
  const unlocked = unlockedWeapons(game);
  const cw = 240, ch = TOOL_H - 32, gap = 14;
  let x = 16;
  for (const [k, def] of Object.entries(TOWERS)) {
    const isOpen   = unlocked.has(k);
    const afford   = game.cash >= def.cost;
    const sel      = placing?.category === 'weapon' && placing?.kind === k;
    uiButtons.push({ x, y: y0+28, w: cw, h: ch, id: `weapon:${k}`, disabled: !afford||!isOpen });
    ctx.fillStyle = sel ? 'rgba(57,255,142,0.10)' : 'rgba(10,20,16,0.9)';
    ctx.fillRect(x, y0+28, cw, ch);
    ctx.strokeStyle = sel ? def.color : '#1d3a2a'; ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeRect(x, y0+28, cw, ch); ctx.lineWidth = 1.6;
    if (!isOpen) {
      ctx.globalAlpha = 0.30;
      drawTowerIcon(null, k, x+26, y0+28+ch/2, false);
      ctx.textAlign='left'; ctx.font='bold 12px monospace'; ctx.fillStyle='#666';
      ctx.fillText(`[${def.key}] ${def.name}`, x+50, y0+48);
      ctx.globalAlpha=1; ctx.fillStyle='#555'; ctx.font='11px monospace';
      ctx.fillText(`🔒 LOCKED — UNLOCKS LEVEL ${unlockLevelOf(k,'weapon')}`, x+50, y0+66);
      x += cw+gap; continue;
    }
    ctx.globalAlpha = afford ? 1 : 0.35;
    drawTowerIcon(null, k, x+26, y0+28+ch/2, false);
    ctx.textAlign='left'; ctx.font='bold 12px monospace'; ctx.fillStyle=def.color;
    ctx.fillText(`[${def.key}] ${def.name}`, x+50, y0+46);
    ctx.font='11px monospace'; ctx.fillStyle='#ffb347';
    ctx.fillText(`$${def.cost}`, x+50, y0+62);
    ctx.fillStyle='#b8e6c9'; wrapText(def.desc, x+50, y0+76, cw-60, 13);
    ctx.globalAlpha=1;
    x += cw+gap;
  }
}

function drawSensorCards(y0) {
  const unlocked = unlockedSensors(game);
  const cw = 200, ch = TOOL_H - 32, gap = 10;
  let x = 16;
  for (const [k, def] of Object.entries(SENSORS)) {
    const isOpen = unlocked.has(k);
    const afford = game.cash >= def.cost;
    const sel    = placing?.category === 'sensor' && placing?.kind === k;
    uiButtons.push({ x, y: y0+28, w: cw, h: ch, id: `sensor:${k}`, disabled: !afford||!isOpen });
    ctx.fillStyle = sel ? 'rgba(77,216,255,0.08)' : 'rgba(10,20,16,0.9)';
    ctx.fillRect(x, y0+28, cw, ch);
    ctx.strokeStyle = sel ? def.color : '#1d3a2a'; ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeRect(x, y0+28, cw, ch); ctx.lineWidth = 1.6;
    if (!isOpen) {
      ctx.globalAlpha=0.30;
      drawSensorIcon(ctx, k, x+20, y0+28+ch/2);
      ctx.textAlign='left'; ctx.font='bold 11px monospace'; ctx.fillStyle='#555';
      ctx.fillText(def.name, x+42, y0+46);
      ctx.globalAlpha=1; ctx.fillStyle='#444'; ctx.font='10px monospace';
      ctx.fillText(`🔒 LEVEL ${unlockLevelOf(k,'sensor')}`, x+42, y0+62);
      x += cw+gap; continue;
    }
    ctx.globalAlpha = afford ? 1 : 0.35;
    drawSensorIcon(ctx, k, x+20, y0+28+ch/2);
    ctx.textAlign='left'; ctx.font='bold 11px monospace'; ctx.fillStyle=def.color;
    ctx.fillText(def.name, x+42, y0+46);
    ctx.font='10px monospace'; ctx.fillStyle='#ffb347';
    ctx.fillText(`$${def.cost}  ${def.range}px range`, x+42, y0+60);
    ctx.fillStyle='#b8e6c9'; wrapText(def.desc, x+42, y0+74, cw-52, 12);
    ctx.globalAlpha=1;
    x += cw+gap;
  }
}

function drawInspect() {
  if (!selected) return;
  const { category, obj } = selected;
  const def = category === 'weapon' ? TOWERS[obj.kind] : SENSORS[obj.kind];
  const bx = clamp(obj.x + 24, 10, W - 250), by = clamp(obj.y - 80, HUD_H + 10, H - TOOL_H - 140);
  ctx.fillStyle = 'rgba(6,16,10,0.95)'; ctx.fillRect(bx, by, 235, 124);
  ctx.strokeStyle = def.color; ctx.strokeRect(bx, by, 235, 124);
  ctx.textAlign = 'left'; ctx.font = 'bold 12px monospace'; ctx.fillStyle = def.color;
  ctx.fillText(`${def.name}  ·  LVL ${obj.lvl}/3`, bx+10, by+20);
  ctx.font = '10px monospace'; ctx.fillStyle = '#b8e6c9';
  wrapText(def.blurb || def.desc, bx+10, by+36, 215, 12);
  if (obj.lvl < 3) {
    const cost = def.upCost[obj.lvl-1];
    btn(bx+10, by+66, 215, 22, `▲ UPGRADE  $${cost}`, 'upgrade', '#39ff8e', game.cash < cost);
  } else {
    ctx.fillStyle='#1f7a4d'; ctx.font='11px monospace'; ctx.textAlign='center';
    ctx.fillText('— MAX LEVEL —', bx+117, by+80);
  }
  btn(bx+10, by+94, 130, 22, `SELL $${Math.round(obj.invested*SELL_RATIO)}`, 'sell', '#ffb347', false);
  btn(bx+150, by+94, 75, 22, 'CLOSE', 'close', '#4dd8ff', false);
}

function drawROE() {
  if (!roeOpen || !game) return;
  const rows = Object.keys(ENEMIES);
  const px = W-272, py = HUD_H+12, pw = 258, ph = rows.length*24+64;
  ctx.fillStyle='rgba(6,16,10,0.96)'; ctx.fillRect(px,py,pw,ph);
  ctx.strokeStyle='#ff5252'; ctx.strokeRect(px,py,pw,ph);
  ctx.textAlign='left'; ctx.font='bold 12px monospace'; ctx.fillStyle='#ff5252';
  ctx.fillText('SAM RULES OF ENGAGEMENT', px+12, py+22);
  ctx.font='10px monospace'; ctx.fillStyle='#1f7a4d';
  ctx.fillText('checked = SAM WILL expend $75 interceptors', px+12, py+38);
  let y = py+50;
  for (const k of rows) {
    const def = ENEMIES[k]; const on = game.samROE[k];
    uiButtons.push({x:px+8, y, w:pw-16, h:22, id:`roe:${k}`, disabled:false});
    if (mouse.x>=px+8&&mouse.x<=px+pw-8&&mouse.y>=y&&mouse.y<=y+22) {
      ctx.fillStyle='rgba(255,82,82,0.08)'; ctx.fillRect(px+8,y,pw-16,22);
    }
    ctx.strokeStyle = on ? '#39ff8e' : '#444'; ctx.strokeRect(px+14,y+5,12,12);
    if (on) { ctx.fillStyle='#39ff8e'; ctx.fillRect(px+17,y+8,6,6); }
    ctx.fillStyle=def.color; ctx.font='11px monospace';
    ctx.fillText(def.name, px+36, y+15);
    if (!def.ew) { ctx.fillStyle='#ffb347'; ctx.fillText('◇', px+pw-58, y+15); }
    ctx.fillStyle='#1f7a4d'; ctx.fillText(`$${def.reward}`, px+pw-40, y+15);
    y += 24;
  }
}

function wrapText(text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW) { ctx.fillText(line, x, y); y += lh; line = w + ' '; }
    else line += w + ' ';
  }
  ctx.fillText(line, x, y);
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

document.getElementById('btnStart').onclick     = beginGame;
document.getElementById('btnDeploy').onclick    = () => { hideAll(); phase = 'build'; };
document.getElementById('btnHelp').onclick      = () => showScreen('helpScreen');
document.getElementById('btnHelpBack').onclick  = () => showScreen('menuScreen');
document.getElementById('btnLB').onclick        = async () => { showScreen('lbScreen'); renderLB(await lbFetch(), 'lbTable'); };
document.getElementById('btnLBBack').onclick    = () => showScreen('menuScreen');
document.getElementById('btnAgain').onclick     = () => { game = null; showScreen('menuScreen'); };
document.getElementById('btnSubmitScore').onclick = async () => {
  const name = (document.getElementById('nameInput').value.trim() || 'ANON').toUpperCase().slice(0, 14);
  localStorage.setItem('ss_callsign', name);
  document.getElementById('btnSubmitScore').disabled = true;
  await lbSubmit(name, game.score);
  document.getElementById('nameEntry').style.display  = 'none';
  document.getElementById('postSubmit').style.display = 'block';
  renderLB(await lbFetch(), 'lbTable2');
};

const SUPABASE_URL      = '';
const SUPABASE_ANON_KEY = '';
const lbConfigured = () => SUPABASE_URL && SUPABASE_ANON_KEY;

async function lbFetch() {
  if (lbConfigured()) {
    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/scores?select=name,score&order=score.desc&limit=10',
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
      if (res.ok) return await res.json();
    } catch(e) {}
  }
  return JSON.parse(localStorage.getItem('ss_scores') || '[]').slice(0, 10);
}

async function lbSubmit(name, score) {
  if (lbConfigured()) {
    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/scores', {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                   'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ name, score })
      });
      if (res.ok) return;
    } catch(e) {}
  }
  const list = JSON.parse(localStorage.getItem('ss_scores') || '[]');
  list.push({ name, score }); list.sort((a,b) => b.score - a.score);
  localStorage.setItem('ss_scores', JSON.stringify(list.slice(0, 25)));
}

function renderLB(rows, tableId) {
  const tb = document.getElementById(tableId);
  let html = '<tr><th>#</th><th>CALLSIGN</th><th>SCORE</th></tr>';
  if (!rows.length) html += '<tr><td colspan=3 style="color:var(--dim)">NO RECORDS YET</td></tr>';
  rows.forEach((r, i) => {
    html += `<tr><td>${i+1}</td><td>${escHtml(r.name)}</td><td>${Number(r.score).toLocaleString()}</td></tr>`;
  });
  tb.innerHTML = html;
}
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

document.getElementById('menuHint').textContent = lbConfigured()
  ? 'GLOBAL LEADERBOARD: ONLINE'
  : 'LEADERBOARD: LOCAL BROWSER ONLY';

showScreen('menuScreen');
requestAnimationFrame(loop);
