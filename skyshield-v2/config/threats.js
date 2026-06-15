/**
 * SKYSHIELD v2 — Threat Definitions
 */

export const ENEMIES = {
  quad: {
    name: "Quadcopter",
    hp: 25, spd: 38, dmg: 5, reward: 15, r: 7,
    ew: true, hpmRes: 0, rfSilent: false,
    color: "#9fd9b8", shape: "quad",
    towerPrio: 0.40,
    desc: "Commercial quad, jammable, low RCS."
  },
  fpv: {
    name: "FPV Attack",
    hp: 18, spd: 85, dmg: 8, reward: 20, r: 6,
    ew: true, hpmRes: 0, rfSilent: false,
    color: "#d9d49f", shape: "quad",
    towerPrio: 0.55,
    desc: "Fast video-link FPV, jammable."
  },
  wing: {
    name: "Recon Wing",
    hp: 70, spd: 48, dmg: 10, reward: 30, r: 10,
    ew: true, hpmRes: 0.15, rfSilent: false,
    color: "#9fc6d9", shape: "wing",
    towerPrio: 0.20,
    desc: "Fixed-wing ISR. Tougher. If it escapes, future waves know sensor gaps."
  },
  auto: {
    name: "Autonomous UAS",
    hp: 30, spd: 46, dmg: 7, reward: 25, r: 7,
    ew: false, hpmRes: 0, rfSilent: true,
    color: "#ffb347", shape: "quad",
    towerPrio: 0.35,
    desc: "GPS-nav only. No RF link — EW-immune, RF/ESM-invisible."
  },
  fiber: {
    name: "Fiber-Optic FPV",
    hp: 22, spd: 75, dmg: 9, reward: 25, r: 6,
    ew: false, hpmRes: 0, rfSilent: true,
    fiber: true,
    color: "#ff8c42", shape: "quad",
    towerPrio: 0.55,
    desc: "Cable-guided. No RF. EW-immune. RF/ESM-blind. EO/IR or Acoustic required."
  },
  swarm: {
    name: "Swarm Element",
    hp: 9, spd: 62, dmg: 3, reward: 6, r: 4,
    ew: true, hpmRes: 0, rfSilent: false,
    color: "#baffba", shape: "dot",
    towerPrio: 0.20,
    desc: "Jammable micro-drone. HPM kills whole formation."
  },
  aswarm: {
    name: "Auto-Swarm",
    hp: 9, spd: 66, dmg: 3, reward: 7, r: 4,
    ew: false, hpmRes: 0, rfSilent: true,
    color: "#ffd9a0", shape: "dot",
    towerPrio: 0.20,
    desc: "Autonomous swarm. EW-immune. HPM or HEL only."
  },
  loiter: {
    name: "Loitering Munition",
    hp: 140, spd: 42, dmg: 20, reward: 60, r: 11,
    ew: false, hpmRes: 0.55, rfSilent: false,
    color: "#ff8888", shape: "delta",
    towerPrio: 0.60,
    desc: "Hardened, EW-immune. HPM-resistant. Hunts sensors and HVAs."
  },
  cruise: {
    name: "Cruise Missile",
    hp: 230, spd: 120, dmg: 35, reward: 100, r: 9,
    ew: false, hpmRes: 0.80, rfSilent: false,
    color: "#ff5252", shape: "missile",
    towerPrio: 0.05,
    desc: "Very fast. Heavily hardened. SAM or sustained HEL only."
  }
};
