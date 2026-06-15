/**
 * SKYSHIELD v2 — Weapon Definitions
 */

export const TOWERS = {
  sam: {
    name: "SAM BATTERY",
    key: "1",
    color: "#ff5252",
    cost: 400,
    shotCost: 75,
    dmg: 500,
    hp: 100,
    lv: [
      { range: 300, reload: 2.2 },
      { range: 345, reload: 1.6 },
      { range: 390, reload: 1.1 }
    ],
    upCost: [250, 350],
    desc: "$75/interceptor. Kills anything. Needs sensor for full Pk.",
    blurb: "Kinetic interceptor. One-shot any target. Pk and range depend on sensor network track quality — without a sensor you get 50% range and 60% Pk.",
    sensorDependent: true,
    pkMin: 0.60,
    pkMax: 0.97,
    tqThreshold: 0.50
  },

  ew: {
    name: "EW JAMMER",
    key: "2",
    color: "#4dd8ff",
    cost: 150,
    shotCost: 0,
    hp: 60,
    lv: [
      { range: 170, jam: 1.4 },
      { range: 200, jam: 1.0 },
      { range: 230, jam: 0.7 }
    ],
    upCost: [100, 150],
    desc: "Free. Area jamming. No sensor needed. RF threats only.",
    blurb: "Autonomously jams any RF-linked threat in range. No sensor required. When ROE demands ID, pairs with RF/ESM or EO/IR. Useless against autonomous/fiber-optic.",
    sensorDependent: false
  },

  hel: {
    name: "HEL LASER",
    key: "3",
    color: "#39ff8e",
    cost: 600,
    shotCost: 0,
    powerDraw: 80,
    hp: 80,
    lv: [
      { range: 250, dps: 55 },
      { range: 290, dps: 85 },
      { range: 330, dps: 120 }
    ],
    upCost: [350, 500],
    desc: "Free per shot. Any target. Integrated EO/IR shares tracks.",
    blurb: "Precision laser burn. Any airframe given dwell time. Has integrated EO/IR aiming system — auto-shares tracks with nearby weapons on the sensor network.",
    sensorDependent: false,
    integratedSensor: {
      type: "eoir",
      shareRange: 280,
      tqRate: 0.80,
      networkShare: true,
      detectsFiber: true
    }
  },

  hpm: {
    name: "HPM EMITTER",
    key: "4",
    color: "#c77dff",
    cost: 550,
    shotCost: 0,
    powerDraw: 120,
    hp: 75,
    lv: [
      { range: 150, dmg: 34, every: 2.4 },
      { range: 175, dmg: 48, every: 2.1 },
      { range: 200, dmg: 65, every: 1.8 }
    ],
    upCost: [300, 450],
    desc: "Free pulses. Hits ALL in range. No sensor needed.",
    blurb: "Wide-area microwave pulse. Fires on everything in range — no track needed. Hardened targets resist. Frequency Agile upgrade defeats hardening.",
    sensorDependent: false,
    integratedSensorUpgrade: {
      extraCost: 150,
      label: "HPM + Sensor",
      sensor: {
        type: "kaband",
        shareRange: 180,
        tqRate: 0.40,
        networkShare: true,
        detectsFiber: false
      }
    }
  }
};

export const SELL_RATIO = 0.6;

export const towerStat = t => TOWERS[t.kind].lv[t.lvl - 1];

export const samEffectiveRange = (tower, tq) => {
  const def = TOWERS[tower.kind];
  const st = towerStat(tower);
  if (!def.sensorDependent) return st.range;
  return tq >= def.tqThreshold ? st.range : st.range * 0.5;
};

export const samPk = (tower, tq) => {
  const def = TOWERS[tower.kind];
  if (!def.sensorDependent) return 1.0;
  if (tq < def.tqThreshold) return def.pkMin;
  const t = (tq - def.tqThreshold) / (1.0 - def.tqThreshold);
  return def.pkMin + t * (def.pkMax - def.pkMin);
};
