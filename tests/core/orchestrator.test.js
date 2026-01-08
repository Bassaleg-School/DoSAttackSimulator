import { describe, it, expect, beforeEach } from 'vitest';
import Orchestrator from '../../js/core/Orchestrator.js';
import { PACKET_TYPES, ATTACK_TYPES, CONSTANTS } from '../../js/constants.js';

describe('Orchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  it('should initialize with default state', () => {
    expect(orchestrator.particles).toEqual([]);
    expect(orchestrator.analyzerLogs).toEqual([]);
    expect(orchestrator.isSimulationRunning).toBe(false);
    expect(orchestrator.server).toBeDefined();
    expect(orchestrator.attacker).toBeDefined();
    expect(orchestrator.firewall).toBeDefined();
  });

  it('should spawn genuine traffic when simulation is running', () => {
    orchestrator.isSimulationRunning = true;
    orchestrator.update(1); // 1 second

    // Should spawn 50 genuine packets (50 users × 1 packet/sec)
    expect(orchestrator.particles.length).toBe(50);
    expect(orchestrator.particles[0].type).toBe(PACKET_TYPES.HTTP_GET);
    expect(orchestrator.particles[0].isMalicious).toBe(false);
  });

  it('should not spawn genuine traffic when simulation is stopped', () => {
    orchestrator.isSimulationRunning = false;
    orchestrator.update(1);

    expect(orchestrator.particles.length).toBe(0);
  });

  it('should spawn attack traffic when attacking', () => {
    orchestrator.attacker.isAttacking = true;
    orchestrator.attacker.deviceCount = 10;
    orchestrator.attacker.attackType = ATTACK_TYPES.UDP;
    orchestrator.attacker.bandwidthMultiplier = 1;

    orchestrator.update(1); // 1 second

    // Should spawn 10 devices × 10 pps × 1 multiplier = 100 packets
    expect(orchestrator.particles.length).toBe(100);
    expect(orchestrator.particles[0].type).toBe(PACKET_TYPES.UDP);
    expect(orchestrator.particles[0].isMalicious).toBe(true);
  });

  it('should respect MAX_ACTIVE_PARTICLES cap', () => {
    orchestrator.attacker.isAttacking = true;
    orchestrator.attacker.deviceCount = 1000;
    orchestrator.attacker.attackType = ATTACK_TYPES.UDP;
    orchestrator.attacker.bandwidthMultiplier = 2;

    // This would spawn 1000 × 10 × 2 = 20000 packets/sec
    // But visual cap is 300 pps, and MAX_ACTIVE_PARTICLES is 1500
    for (let i = 0; i < 10; i++) {
      orchestrator.update(1);
    }

    expect(orchestrator.particles.length).toBeLessThanOrEqual(CONSTANTS.MAX_ACTIVE_PARTICLES);
  });

  it('should process packets through firewall inspection', () => {
    // Block UDP protocol
    orchestrator.firewall.blockedProtocols.add('UDP');
    
    orchestrator.attacker.isAttacking = true;
    orchestrator.attacker.deviceCount = 10;
    orchestrator.attacker.attackType = ATTACK_TYPES.UDP;
    orchestrator.attacker.generateBotnetRanges(); // Ensure ranges exist
    
    orchestrator.update(1); // Spawn some packets (10 devices × 10 pps = 100 packets/sec)
    
    expect(orchestrator.particles.length).toBeGreaterThan(0);
    
    // Move particles to end of pipe and process
    const dt = 0.1;
    for (let i = 0; i < 100; i++) {
      orchestrator.update(dt);
      if (orchestrator.particles.length === 0) break;
    }
    
    // Packets should be blocked by firewall
    expect(orchestrator.analyzerLogs.some(log => log.action === 'BLOCKED')).toBe(true);
  });

  it('should drop legitimate packets when bandwidth > 95% (collision)', () => {
    orchestrator.server.bandwidthUsage = 99; // Keep it high even after decay
    orchestrator.isSimulationRunning = true;
    
    orchestrator.update(0.5); // Spawn genuine traffic (25 packets expected in 0.5 second)
    // After 0.5s, bandwidth decays by 5%, so 99 - 5 = 94, still above threshold after minor decay
    
    expect(orchestrator.particles.length).toBeGreaterThan(0);
    const initialDropped = orchestrator.server.droppedPackets;
    
    // Set bandwidth high again to ensure collision happens
    orchestrator.server.bandwidthUsage = 97;
    
    // Update - particles will be checked for collision
    orchestrator.update(0.016);
    
    // Some legitimate packets should be dropped due to collision
    expect(orchestrator.server.droppedPackets).toBeGreaterThan(initialDropped);
  });

  it('should short-circuit processing when server crashed', () => {
    orchestrator.server.cpuLoad = 99;
    orchestrator.server.updateStatus();
    expect(orchestrator.server.status).toBe('CRASHED');
    
    orchestrator.isSimulationRunning = true;
    orchestrator.update(0.1); // Spawn genuine traffic
    
    // Move particles to end
    orchestrator.particles.forEach(p => {
      p.x = CONSTANTS.CANVAS_WIDTH;
    });
    
    const initialDropped = orchestrator.server.droppedPackets;
    orchestrator.update(0.1); // Process arrivals
    
    // Legitimate packets should be dropped due to crash
    expect(orchestrator.server.droppedPackets).toBeGreaterThan(initialDropped);
    expect(orchestrator.analyzerLogs.some(log => log.reason === 'SERVER_CRASHED')).toBe(true);
  });

  it('should respect analyzer log budget per second', () => {
    orchestrator.attacker.isAttacking = true;
    orchestrator.attacker.deviceCount = 100;
    
    // Spawn and process many packets
    for (let i = 0; i < 5; i++) {
      orchestrator.update(0.1);
      orchestrator.particles.forEach(p => {
        p.x = CONSTANTS.CANVAS_WIDTH;
      });
      orchestrator.update(0.01);
    }
    
    // Analyzer logs should be capped
    expect(orchestrator.analyzerLogs.length).toBeLessThanOrEqual(CONSTANTS.UI_LOG_MAX_ENTRIES);
  });

  it('should prioritize blocked/dropped events in analyzer logs', () => {
    orchestrator.firewall.blockedProtocols.add('UDP');
    orchestrator.attacker.isAttacking = true;
    orchestrator.attacker.deviceCount = 10;
    orchestrator.attacker.attackType = ATTACK_TYPES.UDP;
    
    orchestrator.update(0.5);
    orchestrator.particles.forEach(p => {
      p.x = CONSTANTS.CANVAS_WIDTH;
    });
    orchestrator.update(0.01);
    
    // All logs should be BLOCKED since we blocked UDP
    const blockedLogs = orchestrator.analyzerLogs.filter(log => log.action === 'BLOCKED');
    expect(blockedLogs.length).toBeGreaterThan(0);
  });

  it('should update server state over time', () => {
    // Increase server load
    orchestrator.server.bandwidthUsage = 50;
    orchestrator.server.cpuLoad = 30;
    
    // Update for 1 second (decay should occur)
    orchestrator.update(1);
    
    // Bandwidth should decay by 10% per second
    expect(orchestrator.server.bandwidthUsage).toBe(40);
    // CPU should decay by 2% per second
    expect(orchestrator.server.cpuLoad).toBe(28);
  });

  it('should reset all state', () => {
    orchestrator.isSimulationRunning = true;
    orchestrator.attacker.isAttacking = true;
    orchestrator.update(1);
    
    expect(orchestrator.particles.length).toBeGreaterThan(0);
    
    orchestrator.reset();
    
    expect(orchestrator.particles.length).toBe(0);
    expect(orchestrator.analyzerLogs.length).toBe(0);
    expect(orchestrator.server.bandwidthUsage).toBe(0);
    expect(orchestrator.server.cpuLoad).toBe(0);
  });

  it('should return complete state snapshot', () => {
    const state = orchestrator.getState();
    
    expect(state.server).toBeDefined();
    expect(state.attacker).toBeDefined();
    expect(state.firewall).toBeDefined();
    expect(state.particles).toBeDefined();
    expect(state.analyzerLogs).toBeDefined();
    expect(state.isSimulationRunning).toBe(false);
  });

  // v1.2 Tests: Destination IP assignment
  it('should assign server public IP to genuine packets', () => {
    orchestrator.isSimulationRunning = true;
    orchestrator.update(0.1); // Spawn some genuine packets
    
    expect(orchestrator.particles.length).toBeGreaterThan(0);
    
    // All genuine packets should have destinationIP set to server's public IP
    orchestrator.particles.forEach(packet => {
      expect(packet.destinationIP).toBe(orchestrator.server.publicIP);
    });
  });

  it('should assign attacker target IP to attack packets', () => {
    orchestrator.attacker.isAttacking = true;
    orchestrator.attacker.deviceCount = 10;
    orchestrator.attacker.attackType = ATTACK_TYPES.UDP;
    orchestrator.attacker.targetIP = '198.51.100.20'; // Set a specific target
    
    orchestrator.update(0.1); // Spawn attack packets
    
    expect(orchestrator.particles.length).toBeGreaterThan(0);
    
    // All attack packets should have destinationIP set to attacker's target IP
    orchestrator.particles.forEach(packet => {
      expect(packet.destinationIP).toBe(orchestrator.attacker.targetIP);
    });
  });

  it('should update destination IP when server proxy is enabled', () => {
    orchestrator.isSimulationRunning = true;
    
    // Initial spawn with default public IP
    orchestrator.update(0.05);
    const initialDestIP = orchestrator.particles[0]?.destinationIP;
    expect(initialDestIP).toBe(CONSTANTS.VICTIM_PUBLIC_IP);
    
    // Clear particles
    orchestrator.particles = [];
    
    // Enable proxy
    orchestrator.server.setReverseProxyEnabled(true);
    
    // Spawn new packets
    orchestrator.update(0.05);
    
    // New packets should have proxy public IP as destination
    expect(orchestrator.particles.length).toBeGreaterThan(0);
    orchestrator.particles.forEach(packet => {
      expect(packet.destinationIP).toBe(CONSTANTS.PROXY_PUBLIC_IP);
    });
  });

  // v1.2 Tests: Proxy routing logic
  it('should reject packets with wrong destination IP when proxy is enabled', () => {
    orchestrator.server.setReverseProxyEnabled(true);
    orchestrator.attacker.isAttacking = true;
    orchestrator.attacker.deviceCount = 5;
    orchestrator.attacker.targetIP = '203.0.113.10'; // Wrong IP (origin, not proxy)
    
    orchestrator.update(0.1); // Spawn attack packets
    expect(orchestrator.particles.length).toBeGreaterThan(0);
    
    // Move packets to arrival point
    orchestrator.particles.forEach(p => p.x = CONSTANTS.CANVAS_WIDTH);
    
    orchestrator.update(0.01); // Process arrivals
    
    // Packets should be rejected (MISSED)
    expect(orchestrator.analyzerLogs.some(log => log.action === 'MISSED' && log.reason === 'WRONG_IP')).toBe(true);
  });

  it('should forward packets with correct destination IP through proxy', () => {
    orchestrator.server.setReverseProxyEnabled(true);
    orchestrator.attacker.isAttacking = true;
    orchestrator.attacker.deviceCount = 5;
    orchestrator.attacker.targetIP = CONSTANTS.PROXY_PUBLIC_IP; // Correct proxy IP
    
    orchestrator.update(0.1); // Spawn attack packets
    const originalSourceIPs = orchestrator.particles.map(p => p.sourceIP);
    
    // Move packets to arrival point
    orchestrator.particles.forEach(p => p.x = CONSTANTS.CANVAS_WIDTH);
    
    orchestrator.update(0.01); // Process arrivals
    
    // Check analyzer logs for forwarded packets
    const allowedLogs = orchestrator.analyzerLogs.filter(log => log.action === 'ALLOWED' || log.action === 'DROPPED');
    
    // At least some packets should have been processed (not all rejected)
    expect(allowedLogs.length).toBeGreaterThan(0);
  });

  it('should preserve client IP and rewrite source IP when forwarding through proxy', () => {
    orchestrator.server.setReverseProxyEnabled(true);
    orchestrator.isSimulationRunning = true;
    
    orchestrator.update(0.1); // Spawn genuine packets
    const originalSourceIP = orchestrator.particles[0].sourceIP;
    
    // Manually process one packet to check IP rewriting
    const particle = orchestrator.particles[0];
    particle.x = CONSTANTS.CANVAS_WIDTH; // Move to arrival
    particle.destinationIP = CONSTANTS.PROXY_PUBLIC_IP; // Ensure correct destination
    
    // Before processing, particle has no clientIP (null by default)
    expect(particle.clientIP).toBeNull();
    
    orchestrator.processArrival(particle);
    
    // After processing through proxy, clientIP should be preserved and sourceIP rewritten
    expect(particle.clientIP).toBe(originalSourceIP);
    expect(particle.sourceIP).toMatch(/^198\.51\.100\.\d+$/); // Proxy egress IP pattern
    expect(particle.sourceIP).not.toBe(originalSourceIP); // Source IP was rewritten
    expect(particle.isForwarded).toBe(true); // Marked as forwarded
  });

  it('should process packets normally when proxy is disabled', () => {
    orchestrator.server.setReverseProxyEnabled(false);
    orchestrator.isSimulationRunning = true;
    
    orchestrator.update(0.1); // Spawn genuine packets
    
    // Move packets to arrival point
    orchestrator.particles.forEach(p => p.x = CONSTANTS.CANVAS_WIDTH);
    
    const initialSourceIPs = orchestrator.particles.map(p => p.sourceIP);
    
    orchestrator.update(0.01); // Process arrivals
    
    // Without proxy, packets should be processed without IP rewriting
    // Check logs to ensure packets were processed
    const logs = orchestrator.analyzerLogs;
    expect(logs.length).toBeGreaterThan(0);
    
    // IPs in logs should match original source IPs (no proxy rewriting)
    const logIPs = logs.map(log => log.ip);
    expect(logIPs.some(ip => initialSourceIPs.includes(ip))).toBe(true);
  });

  it('should reject packets targeting origin IP when proxy is enabled', () => {
    orchestrator.server.setReverseProxyEnabled(true);
    orchestrator.isSimulationRunning = true;
    
    // Manually create a packet targeting the origin IP instead of proxy
    orchestrator.update(0.05);
    orchestrator.particles.forEach(p => {
      p.destinationIP = CONSTANTS.VICTIM_ORIGIN_IP; // Wrong - targeting origin directly
      p.x = CONSTANTS.CANVAS_WIDTH; // Move to arrival
    });
    
    orchestrator.update(0.01); // Process arrivals
    
    // All packets should be rejected with MISSED/WRONG_IP
    expect(orchestrator.analyzerLogs.every(log => log.action === 'MISSED' && log.reason === 'WRONG_IP')).toBe(true);
  });
});
