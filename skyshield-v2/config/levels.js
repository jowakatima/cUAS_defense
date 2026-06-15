/**
 * SKYSHIELD v2 — Level & Wave Definitions
 *
 * Wave entry format: [type, count, gap, delay, pathIndex]
 *   gap=0  → all count enemies spawn simultaneously (salvo)
 *   pi=-1  → 360° random spawn (used in mode:"360")
 *
 * corridorWidth: px band around path centerline for enemy spawn spread
 * grant: budget added at level start (one-time, no per-kill bounties)
 * sensorUnlocks: sensor types newly available this level
 * weaponUnlocks: weapon types newly available this level
 */

export const NW_PATH = [[0,   120], [260, 180], [440, 280], [550, 334]];
export const E_PATH  = [[1100,150], [840, 210], [660, 290], [550, 334]];
export const S_PATH  = [[260, 604], [380, 480], [480, 400], [550, 334]];

export const BASE = { x: 550, y: 334, r: 34 };

export const LEVELS = [
  {
    name: "LEVEL 1 — OPENING SALVO",
    mode: "lanes",
    grant: 1200,
    corridorWidth: 60,
    weaponUnlocks: ["sam"],
    sensorUnlocks: ["kaband","acoustic"],
    brief: `Cruise missiles and recon aircraft inbound on known ingress corridors.
Your <b>SAM battery</b> is your only effector right now. Budget is fixed — spend it at the start.
<br><br>
<b>SENSOR BRIEF:</b> A Ka-Band terminal radar is now available. Without it, your SAM operates at
half range and 60% kill probability. Deploying even one sensor dramatically changes your engagement envelope.
Acoustic sensors are cheap inner-ring backup.
<br><br>
Some threats will divert to attack your emplacements before going for the base.`,
    paths: [NW_PATH],
    waves: [
      [["cruise", 3, 0,  0, 0]],
      [["cruise", 3, 0,  0, 0], ["wing", 2, 5, 4, 0]],
      [["cruise", 3, 0,  0, 0], ["cruise", 3, 0, 6, 0], ["wing", 3, 4, 3, 0]]
    ]
  },

  {
    name: "LEVEL 2 — COST ASYMMETRY",
    mode: "lanes",
    grant: 800,
    corridorWidth: 80,
    weaponUnlocks: ["ew"],
    sensorUnlocks: ["rfesm","lband"],
    brief: `<b>$1,000 hobby quadcopters</b> are swarming in salvos across two corridors.
Every SAM interceptor costs more than the target it kills — you <b>will go bankrupt</b> shooting these with kinetics.
<br><br>
New tool authorized: <b>EW Jammer</b>. These drones use commercial C2 links — jam them and they fall for free.
Open <b>SAM ROE</b> and uncheck small targets.
<br><br>
<b>SENSOR BRIEF:</b> RF/ESM passive sensor is now available. It picks up control-link emissions at 500m range —
long before your radars see the drones. Pair it with EW to jam targets before they're even in visual range.
L-Band EWR is also available for long-range track feeding your SAMs on cruise missiles.
<br><br>
Warning: these drones will target your emplacements before the base.`,
    paths: [NW_PATH, E_PATH],
    waves: [
      [["quad", 5, 0, 0, 0], ["quad", 5, 0, 0, 1], ["quad", 4, 0, 8, 0]],
      [["quad", 6, 0, 0, 1], ["fpv",  4, 0, 0, 0], ["quad", 4, 0,10, 1]],
      [["quad", 6, 0, 0, 0], ["fpv",  6, 0, 0, 1], ["quad", 4, 0, 8, 0], ["fpv", 3, 0, 8, 1]],
      [["quad", 8, 0, 0, 1], ["fpv",  6, 0, 2, 0], ["wing", 2, 5, 6, 0], ["fpv", 4, 0,12, 1]]
    ]
  },

  {
    name: "LEVEL 3 — CUT THE CORD",
    mode: "lanes",
    grant: 1100,
    corridorWidth: 100,
    weaponUnlocks: ["hel"],
    sensorUnlocks: ["eoir"],
    brief: `The enemy adapted. <b>Fiber-optic FPVs</b> trail a physical cable — no RF link to jam.
<b>Autonomous airframes</b> navigate without any link at all.
Both show an <b>amber ◇ marker</b>: your jammers cannot touch them.
<br><br>
<b>SENSOR BRIEF:</b> EO/IR sensor is now unlocked. This is the <b>only reliable way to detect fiber-optic FPVs</b> —
the optical system sees the cable. EO/IR is also passive (emits nothing), so it's immune to threat SEAD.
<br><br>
New weapon authorized: <b>HEL Laser</b>. It comes with an integrated EO/IR aiming system — this sensor
<b>automatically shares tracks</b> with your SAM batteries within 280m. Place HEL carefully: it doubles as a
sensor node for the whole network.
<br><br>
Threats now spread across the full corridor width. Your emplacements are priority targets.`,
    paths: [NW_PATH, E_PATH, S_PATH],
    waves: [
      [["quad", 5, 0, 0, 0], ["fiber", 4, 0, 0, 2]],
      [["fiber", 5, 0, 0, 1], ["auto",  5, 0, 0, 2], ["quad",  3, 0, 8, 0]],
      [["auto",  6, 0, 0, 0], ["fiber", 6, 0, 0, 1], ["fpv",   4, 0, 0, 2], ["auto", 3, 0,10, 1]],
      [["fiber", 6, 0, 0, 2], ["auto",  6, 0, 2, 0], ["wing",  3, 4, 5, 1], ["fiber",4, 0,12, 2]]
    ]
  },

  {
    name: "LEVEL 4 — SATURATION",
    mode: "360",
    grant: 1100,
    weaponUnlocks: ["hpm"],
    sensorUnlocks: [],
    brief: `Corridor discipline is gone — micro-drone <b>swarms</b> now attack from <b>any axis</b>.
Your laser kills one target at a time. A 30-drone swarm walks right past it.
<br><br>
New tool authorized: <b>HPM Emitter</b>. One microwave pulse fries every drone in range, free, no waveform library.
Watch for amber autonomous swarm variants your jammers can't touch.
<br><br>
<b>SENSOR BRIEF:</b> HPM doesn't need a sensor — it pulses everything in range. But if you want your SAMs
to engage threats at full efficiency on any axis, you need 360° sensor coverage. Consider Ka-Band rings
around your base or L-Band for early warning on approach vectors.
<br><br>
Swarms will collapse your emplacements before the base if left unchecked.`,
    paths: [],
    waves: [
      [["swarm",  18, 0.40, 0, -1], ["quad",   6, 1.2, 3, -1]],
      [["swarm",  24, 0.35, 0, -1], ["fiber",  6, 1.2, 4, -1]],
      [["aswarm", 18, 0.40, 0, -1], ["swarm", 16, 0.4, 5, -1]],
      [["swarm",  26, 0.30, 0, -1], ["aswarm",16, 0.45,3, -1], ["wing", 3, 4, 8, -1]],
      [["aswarm", 30, 0.28, 0, -1], ["auto",   8, 1.2, 4, -1]]
    ]
  },

  {
    name: "LEVEL 5 — HARDENED THREATS",
    mode: "360",
    grant: 1200,
    weaponUnlocks: [],
    sensorUnlocks: [],
    brief: `Hardened <b>loitering munitions</b> from all axes — EW-immune, shielded electronics
shrug off most of an HPM pulse. This is where the layers matter: HPM sweeps the swarm screen,
HEL burns the heavies, SAMs catch leakers.
<br><br>
Check your ROE — every interceptor wasted on a swarm element is one you won't have for a loitering munition.
<br><br>
<b>Loitering munitions will preferentially hunt your most valuable sensors and weapons.</b>
Keep your EO/IR and radar systems defended with layered HPM/HEL coverage — once your sensor network
goes dark, your SAMs lose half their reach.`,
    paths: [],
    waves: [
      [["loiter",  4, 3.5, 0, -1], ["swarm",  14, 0.4, 2, -1]],
      [["loiter",  6, 2.8, 0, -1], ["aswarm", 16, 0.4, 3, -1]],
      [["loiter",  8, 2.2, 0, -1], ["fiber",   8, 1.0, 2, -1]],
      [["loiter",  8, 2.0, 0, -1], ["swarm",  20, 0.3, 2, -1], ["wing", 4, 3, 6, -1]],
      [["loiter", 12, 1.6, 0, -1], ["aswarm", 20, 0.3, 4, -1]]
    ]
  },

  {
    name: "LEVEL 6 — FULL SPECTRUM",
    mode: "360",
    grant: 1600,
    weaponUnlocks: [],
    sensorUnlocks: [],
    brief: `Combined-arms strike package: swarms to collapse emplacements, loitering munitions behind them,
<b>cruise missiles</b> on the deck at high speed. All axes. Simultaneous.
<br><br>
The full architecture or the base falls:
<ul style="text-align:left;margin:8px 0 0 20px;font-size:12px">
<li>SAMs + L-Band/X-Band → intercept cruise missiles</li>
<li>HPM (Frequency Agile) → defeat swarm screens</li>
<li>HEL + EO/IR network → burn loitering munitions</li>
<li>EW + RF/ESM → suppress RF-linked threats</li>
</ul>
<br>Good luck, Commander.`,
    paths: [],
    waves: [
      [["swarm",  18, 0.35, 0, -1], ["loiter",  5, 2.8, 3, -1]],
      [["cruise",  2, 6.0, 2, -1], ["aswarm", 18, 0.35, 0, -1]],
      [["loiter",  8, 2.0, 0, -1], ["cruise",  3, 5.0, 4, -1], ["swarm", 16, 0.35, 2, -1]],
      [["cruise",  4, 4.0, 0, -1], ["aswarm", 24, 0.30, 2, -1], ["fiber",10, 0.9, 5, -1]],
      [["loiter", 10, 1.8, 0, -1], ["cruise",  4, 4.0, 6, -1], ["swarm",20, 0.3, 3, -1]],
      [["cruise",  6, 3.0, 0, -1], ["loiter", 10, 1.6, 2, -1], ["aswarm",26,0.28,4,-1]]
    ]
  }
];
