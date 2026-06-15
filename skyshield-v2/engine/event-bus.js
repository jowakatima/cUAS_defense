/**
 * SKYSHIELD v2 — Event Bus
 *
 * Simple pub/sub. Systems communicate through events instead of direct calls,
 * keeping each module independently testable.
 *
 * Usage:
 *   bus.on('threat:detected', ({ threatId, tq }) => { ... });
 *   bus.emit('threat:detected', { threatId: e.id, tq: 0.7 });
 *   bus.off('threat:detected', handler);  // cleanup
 */

class EventBus {
  constructor() {
    this._handlers = new Map();
  }

  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(handler);
    return () => this.off(event, handler); // returns unsubscribe fn
  }

  off(event, handler) {
    this._handlers.get(event)?.delete(handler);
  }

  emit(event, data) {
    this._handlers.get(event)?.forEach(h => h(data));
  }

  /** Remove all handlers — useful between levels */
  clear() {
    this._handlers.clear();
  }
}

export const bus = new EventBus();

/**
 * Event catalogue (documentation only — bus is dynamically typed):
 *
 * 'sensor:track'       { sensorId, enemyId, tq }   — sensor updated a track
 * 'threat:detected'    { enemy }                    — threat enters detectable zone
 * 'threat:lost'        { enemy }                    — threat exits all sensor coverage
 * 'engagement:auth'    { enemy, tower }             — kill chain authorized engagement
 * 'tower:damaged'      { tower, attacker, dmg }     — weapon/sensor took a hit
 * 'tower:destroyed'    { tower }                    — emplacement destroyed
 * 'enemy:killed'       { enemy, byJam }             — enemy destroyed
 * 'enemy:hit-base'     { enemy }                    — enemy reached the base
 * 'wave:cleared'       { level, wave }              — all enemies dead, wave done
 * 'level:complete'     { level }                    — all waves done
 * 'game:over'          { won }                      — final state
 */
