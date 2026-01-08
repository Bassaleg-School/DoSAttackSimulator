import { describe, it, expect, vi } from 'vitest';
import { PACKET_TYPES, CONSTANTS } from '../../js/constants.js';
import Packet from '../../js/models/Packet.js';
import GenuineTraffic from '../../js/models/GenuineTraffic.js';

vi.spyOn(Math, 'random');

describe('Packet', () => {
  it('constructs with defaults and infers isMalicious for HTTP_GET', () => {
    const packet = new Packet({ type: PACKET_TYPES.HTTP_GET, sourceIP: '172.16.0.1', speed: 10, payloadSize: 5 });
    expect(packet.type).toBe(PACKET_TYPES.HTTP_GET);
    expect(packet.isMalicious).toBe(false);
    expect(packet.sourceIP).toBe('172.16.0.1');
    expect(packet.speed).toBe(10);
    expect(packet.payloadSize).toBe(5);
    expect(packet.trafficWeight).toBe(1);
  });

  it('allows explicit malicious flag for attack traffic', () => {
    const packet = new Packet({ type: PACKET_TYPES.UDP, isMalicious: true, sourceIP: '10.0.0.1' });
    expect(packet.isMalicious).toBe(true);
    expect(packet.type).toBe(PACKET_TYPES.UDP);
  });
});

describe('GenuineTraffic', () => {
  it('generates user IPs within 172.16.0.1-50 range', () => {
    const traffic = new GenuineTraffic();
    const packets = Array.from({ length: 20 }, () => traffic.spawnPacket());
    packets.forEach((packet) => {
      expect(packet.type).toBe(PACKET_TYPES.HTTP_GET);
      expect(packet.isMalicious).toBe(false);
      const octets = packet.sourceIP.split('.').map((p) => Number(p));
      expect(octets).toHaveLength(4);
      expect(octets[0]).toBe(172);
      expect(octets[1]).toBe(16);
      expect(octets[2]).toBe(0);
      expect(octets[3]).toBeGreaterThanOrEqual(1);
      expect(octets[3]).toBeLessThanOrEqual(CONSTANTS.GENUINE_USER_COUNT);
    });
  });

  it('spawns 50 packets per second total from 50 users', () => {
    const traffic = new GenuineTraffic();
    const packets = traffic.spawnPackets(1);
    expect(packets.length).toBe(CONSTANTS.GENUINE_USER_COUNT * CONSTANTS.GENUINE_PACKETS_PER_USER_PER_SEC);
  });

  it('supports fractional dt with accumulator', () => {
    const traffic = new GenuineTraffic();
    const first = traffic.spawnPackets(0.5);
    const second = traffic.spawnPackets(0.5);
    expect(first.length).toBe(25);
    expect(second.length).toBe(25);
  });
});
