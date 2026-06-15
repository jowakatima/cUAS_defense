/**
 * SKYSHIELD v2 — Tech Tree (stub)
 *
 * Upgrades that live outside the per-emplacement upgrade system.
 * These are global unlocks purchased between waves or levels.
 * Fully implemented in a future sprint — stubbed here for import safety.
 */

export const TECH_TREE = {
  // Directed Energy branch
  hpmFreqAgile: {
    name: "HPM Frequency Agile",
    cost: 400,
    branch: "directedEnergy",
    desc: "HPM cycles frequency bands each pulse, defeating hardened targets' RES shielding. Reduces hpmRes by 0.35 for all targets.",
    unlockLevel: 4,
    apply: (game) => { game.techUnlocks.hpmFreqAgile = true; }
  },

  // Sensor branch
  sensorNetworkLink: {
    name: "Sensor Network Link",
    cost: 300,
    branch: "sensors",
    desc: "All sensors share track data. Track quality for each threat = max across all covering sensors (already default), plus +0.10 TQ bonus when 2+ sensors cover simultaneously.",
    unlockLevel: 3,
    apply: (game) => { game.techUnlocks.sensorNetworkLink = true; }
  },

  // Infrastructure branch
  generator: {
    name: "Power Generator",
    cost: 200,
    branch: "infrastructure",
    desc: "Adds 200kW to base power capacity. Purchasable multiple times. Generators are targetable by threats.",
    unlockLevel: 4,
    apply: (game) => { game.power.capacity += 200; }
  }
};

/** Default tech unlock state for a new game */
export const defaultTechUnlocks = () => ({
  hpmFreqAgile: false,
  sensorNetworkLink: false
});
