/**
 * SKYSHIELD v2 — Sensor Definitions
 *
 * Sensor-weapon pairing rules:
 *  - Kinetics (SAM, CIWS): Need high TQ for full range/Pk. Below TQ 0.5 → range halved, Pk 60%.
 *  - EW Jammer: Operates autonomously (area effect). Sensor only required when ROE demands ID.
 *  - HPM: Fires on anything in range. Sensor only for ROE-ID. Integrated sensor available as upgrade.
 *  - HEL: Has INTRINSIC integrated EO/IR aiming system. Always TQ=1.0 for its own targets.
 *         Shares tracks (networkShare) to any weapon within integratedSensor.shareRange.
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
    coverageAngle: 360,       // degrees; 360 = omnidirectional
    tqRate: 0.15,             // track quality built per second while in range
    jammable: true,           // can be suppressed by EW-capable threats
    poorRCS: ["quad","fpv","fiber","swarm","aswarm"],  // low-RCS: reduced tqRate × 0.4
    detectsFiber: false,      // cannot detect fiber-optic FPVs by RF
    rfOnly: false,
    detectsAll: false,
    powerDraw: 20,            // kW while active
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
    coverageAngle: 60,        // narrow sector — must be pointed toward threat axis
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
    range: 550,
    coverageAngle: 360,
    tqRate: 0.45,             // optimized for fast targets — slower track build on small/slow
    jammable: false,          // millimeter-wave — harder to jam
    poorRCS: ["swarm","aswarm","quad","fpv"],  // small slow targets harder to track precisely
    detectsFiber: false,
    rfOnly: false,
    detectsAll: false,
    powerDraw: 10,
    desc: "Wide-area radar. Excellent vs fast targets (cruise, loiter). Slower track on small/slow drones.",
    blurb: "Millimeter-wave radar with wide coverage across the whole field. Excels at detecting fast-moving threats like cruise missiles. Not jammable, but builds track quality more slowly on small hovering drones — pair with acoustic for inner defense."
  },

  eoir: {
    name: "EO/IR Sensor",
    key: "E",
    color: "#ffb347",
    cost: 350,
    hp: 70,
    upCost: [180, 260],
    range: 280,
    coverageAngle: 90,        // gimbaled, but limited sector
    tqRate: 0.65,
    jammable: false,          // passive optical — emits nothing, immune to SEAD
    poorRCS: [],
    detectsFiber: true,       // sees fiber cable and drone optically — the ONLY reliable fiber detection
    rfOnly: false,
    detectsAll: false,        // degraded in heavy smoke/dust (handled in future weather system)
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
    tqRate: 0.30,             // lower TQ — passive intercept is less precise
    jammable: false,
    poorRCS: [],
    detectsFiber: false,      // fiber-optic has NO RF emissions — invisible to ESM
    rfOnly: true,             // only detects RF-emitting threats
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
    detectsFiber: true,       // hears motor noise — detects everything
    rfOnly: false,
    detectsAll: true,         // detects ALL threat types including autonomous and fiber-optic
    powerDraw: 2,
    desc: "Short-range. Detects ALL threats by motor noise. Not jammable.",
    blurb: "Hears motor noise from any drone type — including fiber-optic and autonomous. Very short range but unjammable and passive. Good last-resort inner ring."
  }
};

/** Which sensor keys unlock at each level (1-indexed) */
export const SENSOR_UNLOCKS = {
  1: ["kaband","acoustic"],
  2: ["rfesm","lband"],
  3: ["eoir"],
  4: ["xband"],
  5: [],
  6: []
};
