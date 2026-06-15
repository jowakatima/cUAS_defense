/**
 * SKYSHIELD v2 — Math Utilities
 */

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function pathLength(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++)
    l += Math.hypot(pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]);
  return l;
}

export function pointOnPath(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]);
    if (d <= seg) {
      const t = d / seg;
      return {
        x: pts[i-1][0] + (pts[i][0]-pts[i-1][0]) * t,
        y: pts[i-1][1] + (pts[i][1]-pts[i-1][1]) * t,
        ang: Math.atan2(pts[i][1]-pts[i-1][1], pts[i][0]-pts[i-1][0])
      };
    }
    d -= seg;
  }
  const n = pts.length - 1;
  return { x: pts[n][0], y: pts[n][1], ang: 0 };
}

export function distToPath(p, pts) {
  let best = 1e9;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i-1][0], ay = pts[i-1][1];
    const bx = pts[i][0],   by = pts[i][1];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx*dx + dy*dy;
    let t = len2 ? ((p.x-ax)*dx + (p.y-ay)*dy) / len2 : 0;
    t = clamp(t, 0, 1);
    best = Math.min(best, Math.hypot(p.x - (ax + dx*t), p.y - (ay + dy*t)));
  }
  return best;
}

/** Angle from point a to point b */
export const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

/** Wrap angle to [-π, π] */
export function wrapAngle(a) {
  while (a >  Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
