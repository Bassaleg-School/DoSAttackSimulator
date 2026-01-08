import { describe, it, expect, beforeEach } from 'vitest';
import Orchestrator from '../../js/core/Orchestrator.js';
import { ATTACK_TYPES, CONSTANTS } from '../../js/constants.js';

describe('Performance Caps and Stability', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  describe('MAX_ACTIVE_PARTICLES', () => {
    it('should never exceed the maximum particle limit', () => {
      // Massive attack to try to overflow particles
      orchestrator.attacker.isAttacking = true;
      orchestrator.attacker.deviceCount = 1000;
      orchestrator.attacker.attackType = ATTACK_TYPES.UDP;
      orchestrator.attacker.bandwidthMultiplier = 2;
      orchestrator.attacker.generateBotnetRanges();

      // Update many times
      for (let i = 0; i < 100; i++) {
        orchestrator.update(0.1);
        expect(orchestrator.particles.length).toBeLessThanOrEqual(CONSTANTS.MAX_ACTIVE_PARTICLES);
      }
    });

    it('should cap particles from both genuine and attack traffic', () => {
      orchestrator.isSimulationRunning = true;
      orchestrator.attacker.isAttacking = true;
      orchestrator.attacker.deviceCount = 1000;
      orchestrator.attacker.bandwidthMultiplier = 2;
      orchestrator.attacker.generateBotnetRanges();

      // Update many times
      for (let i = 0; i < 50; i++) {
        orchestrator.update(0.5);
        expect(orchestrator.particles.length).toBeLessThanOrEqual(CONSTANTS.MAX_ACTIVE_PARTICLES);
      }
    });
  });

  describe('VISUAL_SPAWN_CAP_PER_SECOND', () => {
    it('should limit visual spawn rate while preserving desired PPS with trafficWeight', () => {
      orchestrator.attacker.isAttacking = true;
      orchestrator.attacker.deviceCount = 1000;
      orchestrator.attacker.attackType = ATTACK_TYPES.UDP;
      orchestrator.attacker.bandwidthMultiplier = 2;
      
      const spawnResult = orchestrator.attacker.spawnPackets(1);
      
      // Desired PPS should be: 1000 * 10 * 2 = 20000
      expect(spawnResult.desiredPps).toBe(20000);
      
      // Visual PPS should be capped at VISUAL_SPAWN_CAP_PER_SECOND (300)
      expect(spawnResult.visualPps).toBe(CONSTANTS.VISUAL_SPAWN_CAP_PER_SECOND);
      
      // Traffic weight should compensate
      const expectedWeight = (20000 / 300) * CONSTANTS.PACKET_VISUAL_SCALE;
      expect(spawnResult.trafficWeight).toBeCloseTo(expectedWeight, 1);
      
      // Spawned packets should be at visual cap
      expect(spawnResult.packets.length).toBeLessThanOrEqual(CONSTANTS.VISUAL_SPAWN_CAP_PER_SECOND);
    });

    it('should use trafficWeight to preserve server load accuracy', () => {
      orchestrator.attacker.isAttacking = true;
      orchestrator.attacker.deviceCount = 500;
      orchestrator.attacker.attackType = ATTACK_TYPES.UDP;
      orchestrator.attacker.bandwidthMultiplier = 2;
      orchestrator.attacker.generateBotnetRanges();

      const initialBandwidth = orchestrator.server.bandwidthUsage;
      
      orchestrator.update(1);
      
      // Move packets to server
      for (let i = 0; i < 100; i++) {
        orchestrator.update(0.1);
        if (orchestrator.particles.length === 0) break;
      }

      // Server bandwidth should increase significantly despite visual cap
      // because trafficWeight scales the load
      expect(orchestrator.server.bandwidthUsage).toBeGreaterThan(initialBandwidth);
    });
  });

  describe('Analyzer Log Budget', () => {
    it('should respect UI_ANALYZER_LOG_MAX_PER_SECOND', () => {
      orchestrator.attacker.isAttacking = true;
      orchestrator.attacker.deviceCount = 100;
      orchestrator.attacker.generateBotnetRanges();

      // Spawn and process many packets in a short time
      orchestrator.update(0.1);
      
      // Process arrivals rapidly
      for (let i = 0; i < 20; i++) {
        orchestrator.particles.forEach(p => {
          p.x = CONSTANTS.CANVAS_WIDTH; // Move to end instantly
        });
        orchestrator.update(0.01);
      }

      // Count logs added in the recent updates
      // The orchestrator should limit logs per second
      // Since we're processing in small time steps, budget accumulates slowly
      expect(orchestrator.analyzerLogBudget).toBeLessThanOrEqual(CONSTANTS.UI_ANALYZER_LOG_MAX_PER_SECOND);
    });

    it('should prioritize blocked/dropped events over allowed', () => {
      // Block UDP to create high-priority events
      orchestrator.firewall.blockedProtocols.add('UDP');
      
      orchestrator.isSimulationRunning = true;
      orchestrator.attacker.isAttacking = true;
      orchestrator.attacker.deviceCount = 50;
      orchestrator.attacker.attackType = ATTACK_TYPES.UDP;
      orchestrator.attacker.generateBotnetRanges();

      orchestrator.update(1);
      
      // Process packets
      for (let i = 0; i < 50; i++) {
        orchestrator.update(0.1);
      }

      // Should have blocked events due to prioritization
      const blockedCount = orchestrator.analyzerLogs.filter(
        log => log.action === 'BLOCKED' || log.action === 'DROPPED'
      ).length;
      
      expect(blockedCount).toBeGreaterThan(0);
    });

    it('should cap total analyzer logs at UI_LOG_MAX_ENTRIES', () => {
      orchestrator.attacker.isAttacking = true;
      orchestrator.attacker.deviceCount = 100;
      orchestrator.attacker.generateBotnetRanges();

      // Generate many log entries
      for (let i = 0; i < 200; i++) {
        orchestrator.update(0.5);
        orchestrator.particles.forEach(p => {
          p.x = CONSTANTS.CANVAS_WIDTH;
        });
        orchestrator.update(0.01);
      }

      // Total logs should never exceed max
      expect(orchestrator.analyzerLogs.length).toBeLessThanOrEqual(CONSTANTS.UI_LOG_MAX_ENTRIES);
    });
  });

  describe('Performance Stability', () => {
    it('should handle extended simulation without degradation', () => {
      orchestrator.isSimulationRunning = true;
      orchestrator.attacker.isAttacking = true;
      orchestrator.attacker.deviceCount = 100;
      orchestrator.attacker.generateBotnetRanges();

      // Run for many update cycles
      for (let i = 0; i < 1000; i++) {
        orchestrator.update(0.016); // ~60fps
        
        // Verify constraints are maintained
        expect(orchestrator.particles.length).toBeLessThanOrEqual(CONSTANTS.MAX_ACTIVE_PARTICLES);
        expect(orchestrator.analyzerLogs.length).toBeLessThanOrEqual(CONSTANTS.UI_LOG_MAX_ENTRIES);
      }
    });

    it('should handle rapid start/stop cycles', () => {
      for (let i = 0; i < 10; i++) {
        orchestrator.isSimulationRunning = true;
        orchestrator.attacker.isAttacking = true;
        orchestrator.attacker.deviceCount = 50;
        orchestrator.attacker.generateBotnetRanges();
        
        orchestrator.update(0.5);
        
        orchestrator.isSimulationRunning = false;
        orchestrator.attacker.isAttacking = false;
        
        orchestrator.update(0.5);
        
        // System should remain stable
        expect(orchestrator.particles.length).toBeLessThanOrEqual(CONSTANTS.MAX_ACTIVE_PARTICLES);
      }
    });
  });

  describe('Memory Management', () => {
    it('should properly clean up particles as they are processed', () => {
      orchestrator.attacker.isAttacking = true;
      orchestrator.attacker.deviceCount = 50;
      orchestrator.attacker.generateBotnetRanges();

      orchestrator.update(1);
      
      const initialCount = orchestrator.particles.length;
      expect(initialCount).toBeGreaterThan(0);

      // Stop spawning new particles
      orchestrator.attacker.isAttacking = false;

      // Process all particles - need enough time for 1000px at 200px/s = 5 seconds
      for (let i = 0; i < 20; i++) {
        orchestrator.update(1);
        if (orchestrator.particles.length === 0) break;
      }

      // All particles should eventually be processed and removed
      expect(orchestrator.particles.length).toBe(0);
    });

    it('should limit log arrays to prevent memory leaks', () => {
      orchestrator.attacker.isAttacking = true;
      orchestrator.attacker.deviceCount = 100;
      orchestrator.attacker.generateBotnetRanges();

      // Generate many events
      for (let i = 0; i < 500; i++) {
        orchestrator.update(0.1);
      }

      // Logs should be capped
      expect(orchestrator.analyzerLogs.length).toBeLessThanOrEqual(CONSTANTS.UI_LOG_MAX_ENTRIES);
    });
  });
});
