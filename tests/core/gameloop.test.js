import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GameLoop from '../../js/core/GameLoop.js';

describe('GameLoop', () => {
  let mockRAF;
  let mockCancelRAF;
  let rafCallbacks;
  let rafId;

  beforeEach(() => {
    rafCallbacks = [];
    rafId = 0;

    mockRAF = vi.fn((callback) => {
      rafId += 1;
      rafCallbacks.push({ id: rafId, callback });
      return rafId;
    });

    mockCancelRAF = vi.fn((id) => {
      const index = rafCallbacks.findIndex((item) => item.id === id);
      if (index !== -1) {
        rafCallbacks.splice(index, 1);
      }
    });

    global.requestAnimationFrame = mockRAF;
    global.cancelAnimationFrame = mockCancelRAF;
    global.performance = { now: () => 0 }; // Start at time 0
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call update callback with delta time', () => {
    const updateCallback = vi.fn();
    const loop = new GameLoop(updateCallback);
    
    loop.start();
    expect(loop.isRunning).toBe(true);
    expect(mockRAF).toHaveBeenCalledTimes(1);

    // First tick (timestamp = 0) - no callback yet
    expect(updateCallback).not.toHaveBeenCalled();

    // Second tick (timestamp = 16.67ms ~= 60fps)
    const firstCallback = rafCallbacks[0].callback;
    firstCallback(16.67);
    expect(updateCallback).toHaveBeenCalledWith(0.01667);
    expect(mockRAF).toHaveBeenCalledTimes(2);

    loop.stop();
  });

  it('should compute correct delta time for multiple frames', () => {
    const updateCallback = vi.fn();
    const loop = new GameLoop(updateCallback);

    loop.start();
    
    // Frame 1 at t=0
    rafCallbacks[0].callback(0);
    expect(updateCallback).not.toHaveBeenCalled();

    // Frame 2 at t=16
    rafCallbacks[1].callback(16);
    expect(updateCallback).toHaveBeenCalledWith(0.016);

    // Frame 3 at t=32
    rafCallbacks[2].callback(32);
    expect(updateCallback).toHaveBeenCalledWith(0.016);

    loop.stop();
  });

  it('should stop the loop when stop is called', () => {
    const updateCallback = vi.fn();
    const loop = new GameLoop(updateCallback);

    loop.start();
    expect(loop.isRunning).toBe(true);
    
    loop.stop();
    expect(loop.isRunning).toBe(false);
    expect(mockCancelRAF).toHaveBeenCalled();
  });

  it('should not start multiple loops', () => {
    const updateCallback = vi.fn();
    const loop = new GameLoop(updateCallback);

    loop.start();
    const rafCountAfterFirstStart = mockRAF.mock.calls.length;

    loop.start();
    expect(mockRAF.mock.calls.length).toBe(rafCountAfterFirstStart);

    loop.stop();
  });

  it('should handle stop when not running', () => {
    const updateCallback = vi.fn();
    const loop = new GameLoop(updateCallback);

    expect(() => loop.stop()).not.toThrow();
    expect(loop.isRunning).toBe(false);
  });
});
