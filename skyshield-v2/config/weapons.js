/**
 * SKYSHIELD v2 — Weapon Definitions
 *
 * Each weapon has lv[] per upgrade tier and upCost[] for upgrades.
 *
 * Sensor-pairing rules:
 *  sam/ciws : kinetics — TQ from sensor network drives Pk and range
 *  ew       : autonomous — no sensor needed; rfesm sensor improves target discrimination
 *  hel      : has integratedSensor (EO/IR) — always TQ=1.0 for its own engagements;
 *             shares tracks to other weapons within integratedSensor.shareRange
 *  hpm      : autonomous area-effect — no sensor required;
 *             integratedSensorUpgrade available for standalone deployment
 */

export const TOWERS = {
  sam: {
    name: "SAM BATTERY",
    key: "1",
    color: "#ff5252",
    cost: 400,
    shotCost: 50,
    dmg: 500,
    hp: 100,
    lv: [
      { range: 300, reload: 1.6 },
      { range: 345, reload: 1.2 },
      { range: 390, reload: 0.8 }
    ],
    upCost: [250, 350],
    desc: "$50/interceptor. Kills anything. Needs sensor for full Pk.",
    blurb: "$50/interceptor. Kinetic — one-shot any target. Pk and range depend on sensor network track quality — without a sensor you get 50% range and 60% Pk.",
    // Sensor pairing: kinetic — scales with TQ
    sensorDependent: true,
    pkMin: 0.60,           // Pk at TQ 0 (short range only, 50% range)
    pkMax: 0.97,           // Pk at TQ 1.0
    tqThreshold: 0.50      // below this TQ: range halved, Pk = pkMin
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
    sensorDependent: false   // operates independently
  },

  hel: {
    name: "HEL LASER",
    key: "3",
    color: "#39ff8e",
    cost: 600,
    shotCost: 0,
    powerDraw: 80,           // kW while beam is active
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
    // Integrated EO/IR — always available, not a player-placed sensor
    integratedSensor: {
      type: "eoir",
      shareRange: 280,       // radius in which track data is shared to other weapons
      tqRate: 0.80,          // high precision — builds TQ fast
      networkShare: true,    // contributes to the sensor network for other weapons
      detectsFiber: true     // optical system sees fiber-optic FPVs
    }
  },

  hpm: {
    name: "HPM EMITTER",
    key: "4",
    color: "#c77dff",
    cost: 550,
    shotCost: 0,
    powerDraw: 120,          // kW per pulse burst
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
    // Optional integrated sensor upgrade (purchased at placement time)
    integratedSensorUpgrade: {
      extraCost: 150,        // added to base cost when player selects integrated version
      label: "HPM + Sensor",
      sensor: {
        type: "kaband",      // Ka-band terminal + passive RF
        shareRange: 180,
        tqRate: 0.40,
        networkShare: true,
        detectsFiber: false
      }
    }
  }
};

export const SELL_RATIO = 0.6;

/** Returns the stat block for the current upgrade level */
export const towerStat = t => TOWERS[t.kind].lv[t.lvl - 1];

/** Compute effective SAM range given track quality */
export const samEffectiveRange = (tower, tq) => {
  const def = TOWERS[tower.kind];
  const st = towerStat(tower);
  if (!def.sensorDependent) return st.range;
  return tq >= def.tqThreshold ? st.range : st.range * 0.5;
};

/** Compute SAM hit probability given track quality */
export const samPk = (tower, tq) => {
  const def = TOWERS[tower.kind];
  if (!def.sensorDependent) return 1.0;
  if (tq < def.tqThreshold) return def.pkMin;
  // Linear interpolation from pkMin at threshold to pkMax at 1.0
  const t = (tq - def.tqThreshold) / (1.0 - def.tqThreshold);
  return def.pkMin + t * (def.pkMax - def.pkMin);
};
