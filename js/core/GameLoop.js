export default class GameLoop {
  constructor(updateCallback) {
    this.updateCallback = updateCallback;
    this.isRunning = false;
    this.lastTimestamp = null;
    this.rafId = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = null;
    this.tick(performance.now());
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  tick(timestamp) {
    if (!this.isRunning) return;

    if (this.lastTimestamp !== null) {
      const dt = (timestamp - this.lastTimestamp) / 1000; // Convert to seconds
      if (dt > 0) { // Only call update if dt is positive (skip if dt is 0 or negative)
        this.updateCallback(dt);
      } else if (dt <= 0) {
        // Log warning for non-positive delta time to help debug timing issues
        console.warn('GameLoop: non-positive delta time detected, skipping update', {
          dt,
          timestamp,
          lastTimestamp: this.lastTimestamp
        });
      }
    }

    this.lastTimestamp = timestamp;
    this.rafId = requestAnimationFrame((ts) => this.tick(ts));
  }
}
