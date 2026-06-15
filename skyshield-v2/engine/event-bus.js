/**
 * SKYSHIELD v2 — Event Bus
 */

class EventBus {
  constructor() {
    this._handlers = new Map();
  }

  on(event, handler) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this._handlers.get(event)?.delete(handler);
  }

  emit(event, data) {
    this._handlers.get(event)?.forEach(h => h(data));
  }

  clear() {
    this._handlers.clear();
  }
}

export const bus = new EventBus();
