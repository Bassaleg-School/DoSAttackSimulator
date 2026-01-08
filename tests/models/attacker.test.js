import { describe, it, expect, beforeEach, vi } from 'vitest';
import Attacker from '../../js/models/Attacker.js';
import { ATTACK_TYPES, CONSTANTS } from '../../js/constants.js';

const originalRandom = Math.random;

function mockRandomSequence(sequence) {
  let index = 0;
  Math.random = vi.fn(() => {
    const value = sequence[index % sequence.length];
    index += 1;
    return value;
  });
}

describe('Attacker', () => {
  beforeEach(() => {
    Math.random = originalRandom;
  });

  it('generates botnet ranges ceil(deviceCount/20) and avoids genuine subnet', () => {
    mockRandomSequence([0.1, 0.2, 0.3, 0.4]);
    const attacker = new Attacker({ deviceCount: 45 });
    const ranges = attacker.generateBotnetRanges();
    expect(ranges.length).toBe(Math.ceil(45 / CONSTANTS.DEVICES_PER_SUBNET));
    ranges.forEach((subnet) => {
      expect(subnet).not.toBe(CONSTANTS.GENUINE_IP_PREFIX);
      expect(subnet.split('.')).toHaveLength(3);
    });
  });

  it('selects base rate per attack type', () => {
    const udp = new Attacker({ attackType: ATTACK_TYPES.UDP });
    expect(udp.getBaseRate()).toBe(CONSTANTS.ATTACK_RATE_UDP);
    const icmp = new Attacker({ attackType: ATTACK_TYPES.ICMP });
    expect(icmp.getBaseRate()).toBe(CONSTANTS.ATTACK_RATE_ICMP);
    const syn = new Attacker({ attackType: ATTACK_TYPES.TCP_SYN });
    expect(syn.getBaseRate()).toBe(CONSTANTS.ATTACK_RATE_TCP_SYN);
  });

  it('computes desired vs visual pps and applies trafficWeight when capped', () => {
    const attacker = new Attacker({ deviceCount: 100, attackType: ATTACK_TYPES.UDP, bandwidthMultiplier: 2 });
    const { desiredPps, visualPps, trafficWeight, packets } = attacker.spawnPackets(1);
    const expectedDesired = 100 * CONSTANTS.ATTACK_RATE_UDP * 2;
    const expectedVisual = Math.min(expectedDesired, CONSTANTS.VISUAL_SPAWN_CAP_PER_SECOND);
    expect(desiredPps).toBe(expectedDesired);
    expect(visualPps).toBe(expectedVisual);
    expect(trafficWeight).toBeCloseTo(expectedDesired / expectedVisual);
    packets.forEach((p) => {
      expect(p.trafficWeight).toBeCloseTo(trafficWeight);
    });
  });

  it('uses accumulator over fractional dt and spawns from botnet ranges', () => {
    mockRandomSequence([0.01, 0.02, 0.03, 0.04, 0.05]);
    const attacker = new Attacker({ deviceCount: 20, attackType: ATTACK_TYPES.ICMP, bandwidthMultiplier: 1 });
    attacker.generateBotnetRanges();
    const first = attacker.spawnPackets(0.5);
    const second = attacker.spawnPackets(0.5);
    const baseRate = CONSTANTS.ATTACK_RATE_ICMP;
    const desiredPerSec = 20 * baseRate;
    const visualPerSec = Math.min(desiredPerSec, CONSTANTS.VISUAL_SPAWN_CAP_PER_SECOND);
    expect(first.packets.length + second.packets.length).toBe(visualPerSec);
    [...first.packets, ...second.packets].forEach((packet) => {
      expect(packet.sourceIP.startsWith(attacker.botnetRanges[0])).toBe(true);
      expect(packet.isMalicious).toBe(true);
    });
  });
});
