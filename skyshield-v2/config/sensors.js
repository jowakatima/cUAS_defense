/**
 * SKYSHIELD v2 — Sensor Definitions
 */

export const SENSORS = {
  lband: {
    name: "L-Band EWR",
    key: "L",
    color: "#4dd8ff",
    cost: 300,
    hp: 80,
    upCost: [150, 220],
    range: 600,
    coverageAngle: 360,
    tqRate: 0.15,
    jammable: true,
    poorRCS: ["quad","fpv","fiber","swarm","aswarm"],
    detectsFiber: false,
    rfOnly: false,
    detectsAll: false,
    powerDraw: 20,
    desc: "Long-range 360° early warning. Jammable. Poor small-RCS detection.",
    blurb: "Detects all but small-RCS targets at long range. Jammable by EW-capable threats. Needed to feed SAM batteries."
  },

  xband: {
    name: "X-Band Track Radar",
    key: "X",
    color: "#39ff8e",
    cost: 250,
    hp: 60,
    upCost: [120, 180],
    range: 350,
    coverageAngle: 60,
    tqRate: 0.55,
    jammable: true,
    poorRCS: ["quad","fpv","swarm","aswarm","fiber"],
    detectsFiber: false,
    rfOnly: false,
    detectsAll: false,
    powerDraw: 15,
    desc: "High-quality fire-control track. Narrow sector. Jammable.",
    blurb: "Precision fire-control radar for SAM batteries. Narrow 60° sector — point it at the threat axis. Gives SAMs full Pk."
  },

  kaband: {
    name: "Ka-Band Terminal Radar",
    key: "K",
    color: "#c77dff",
    cost: 200,
    hp: 50,
    upCost: [100, 150],
    range: 200,
    coverageAngle: 360,
    tqRate: 0.70,
    jammable: false,
    poorRCS: [],
    detectsFiber: false,
    rfOnly: false,
    detectsAll: false,
    powerDraw: 10,
    desc: "Short-range terminal radar. Detects swarms and small RCS. Hard to jam.",
    blurb: "Best for swarms and small quads at close range. Not jammable. Pairs well with HPM and CIWS."
  },

  eoir: {
    name: "EO/IR Sensor",
    key: "E",
    color: "#ffb347",
    cost: 350,
    hp: 70,
    upCost: [180, 260],
    range: 280,
    coverageAngle: 90,
    tqRate: 0.65,
    jammable: false,
    poorRCS: [],
    detectsFiber: true,
    rfOnly: false,
    detectsAll: false,
    powerDraw: 8,
    desc: "Passive optical. SEAD-immune. Identifies fiber-optic FPVs. 90° sector.",
    blurb: "Passive — emits no signal so SEAD drones ignore it. The only sensor that reliably identifies fiber-optic FPVs. Pairs perfectly with HEL."
  },

  rfesm: {
    name: "RF/ESM Passive",
    key: "R",
    color: "#ff8888",
    cost: 150,
    hp: 40,
    upCost: [75, 120],
    range: 500,
    coverageAngle: 360,
    tqRate: 0.30,
    jammable: false,
    poorRCS: [],
    detectsFiber: false,
    rfOnly: true,
    detectsAll: false,
    powerDraw: 5,
    desc: "Passive RF intercept. Long range. Invisible to SEAD. RF threats only.",
    blurb: "Listens for RF emissions. Long range, passive, SEAD-immune. Cannot detect autonomous or fiber-optic threats. Required for RF Spoofer weapon."
  },

  acoustic: {
    name: "Acoustic Sensor",
    key: "A",
    color: "#baffba",
    cost: 100,
    hp: 30,
    upCost: [50, 80],
    range: 150,
    coverageAngle: 360,
    tqRate: 0.45,
    jammable: false,
    poorRCS: [],
    detectsFiber: true,
    rfOnly: false,
    detectsAll: true,
    powerDraw: 2,
    desc: "Short-range. Detects ALL threats by motor noise. Not jammable.",
    blurb: "Hears motor noise from any drone type — including fiber-optic and autonomous. Very short range but unjammable and passive. Good last-resort inner ring."
  }
};

export const SENSOR_UNLOCKS = {
  1: ["kaband","acoustic"],
  2: ["rfesm","lband"],
  3: ["eoir"],
  4: ["xband"],
  5: [],
  6: []
};
