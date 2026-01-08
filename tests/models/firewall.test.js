import { describe, it, expect } from 'vitest';
import Firewall from '../../js/models/Firewall.js';
import { PACKET_TYPES, PROTOCOLS, CONSTANTS } from '../../js/constants.js';

function makePacket(type, sourceIP = '45.33.12.5') {
  return { type, sourceIP };
}

describe('Firewall', () => {
  it('blocks TCP protocol for HTTP_GET and TCP_SYN', () => {
    const fw = new Firewall();
    fw.blockedProtocols.add(PROTOCOLS.TCP);
    expect(fw.inspect(makePacket(PACKET_TYPES.HTTP_GET)).allowed).toBe(false);
    expect(fw.inspect(makePacket(PACKET_TYPES.TCP_SYN)).allowed).toBe(false);
  });

  it('blocks UDP and ICMP individually', () => {
    const fw = new Firewall();
    fw.blockedProtocols.add(PROTOCOLS.UDP);
    expect(fw.inspect(makePacket(PACKET_TYPES.UDP)).allowed).toBe(false);
    fw.blockedProtocols.delete(PROTOCOLS.UDP);
    fw.blockedProtocols.add(PROTOCOLS.ICMP);
    expect(fw.inspect(makePacket(PACKET_TYPES.ICMP)).allowed).toBe(false);
  });

  it('blocks /24 blacklisted subnet and allows others', () => {
    const fw = new Firewall();
    fw.blockedIPs.add('45.33.12');
    expect(fw.inspect(makePacket(PACKET_TYPES.UDP, '45.33.12.7')).allowed).toBe(false);
    expect(fw.inspect(makePacket(PACKET_TYPES.UDP, '99.1.2.3')).allowed).toBe(true);
  });

  it('rate limits per IP per second with protocol scope and resets window', () => {
    const fw = new Firewall({ rateLimitEnabled: true, dashboardOpen: true, rateLimitThreshold: 2, rateLimitScope: PROTOCOLS.UDP });
    const baseTime = 1000;
    const pkt = makePacket(PACKET_TYPES.UDP, '10.0.0.1');
    expect(fw.inspect(pkt, baseTime).allowed).toBe(true); // 1
    expect(fw.inspect(pkt, baseTime + 0.2).allowed).toBe(true); // 2
    expect(fw.inspect(pkt, baseTime + 0.3).allowed).toBe(false); // blocked at 3rd
    expect(fw.inspect(pkt, baseTime + 1.2).allowed).toBe(true); // window reset
  });

  it('rate limit inactive when dashboard closed', () => {
    const fw = new Firewall({ rateLimitEnabled: true, dashboardOpen: false, rateLimitThreshold: 1 });
    const pkt = makePacket(PACKET_TYPES.ICMP, '10.0.0.2');
    expect(fw.inspect(pkt, 1).allowed).toBe(true);
    expect(fw.inspect(pkt, 1.1).allowed).toBe(true); // would have blocked if active
  });

  it('tracks detected subnets from traffic', () => {
    const fw = new Firewall();
    fw.inspect(makePacket(PACKET_TYPES.UDP, '10.1.1.1'), 1);
    fw.inspect(makePacket(PACKET_TYPES.HTTP_GET, '192.168.5.2'), 1);
    const subnets = fw.getDetectedSubnets();
    expect(subnets).toEqual(expect.arrayContaining(['10.1.1', '192.168.5']));
  });

  // v1.2 Tests: Reverse Proxy
  it('uses clientIP for rate limiting when available (reverse proxy enabled)', () => {
    const fw = new Firewall({ rateLimitEnabled: true, dashboardOpen: true, rateLimitThreshold: 2, rateLimitScope: 'ALL' });
    const baseTime = 1000;
    // When reverse proxy is enabled, all packets come from proxy egress but have clientIP
    const pkt1 = { type: PACKET_TYPES.HTTP_GET, sourceIP: '198.51.100.5', clientIP: '45.33.12.7' };
    const pkt2 = { type: PACKET_TYPES.HTTP_GET, sourceIP: '198.51.100.5', clientIP: '99.1.2.3' };
    
    // Two different client IPs should have separate rate limits
    expect(fw.inspect(pkt1, baseTime).allowed).toBe(true); // client1: 1
    expect(fw.inspect(pkt1, baseTime + 0.1).allowed).toBe(true); // client1: 2
    expect(fw.inspect(pkt2, baseTime + 0.2).allowed).toBe(true); // client2: 1 (different client)
    expect(fw.inspect(pkt1, baseTime + 0.3).allowed).toBe(false); // client1: 3 (blocked)
    expect(fw.inspect(pkt2, baseTime + 0.4).allowed).toBe(true); // client2: 2 (still ok)
  });

  it('uses clientIP for IP blocking when available (reverse proxy enabled)', () => {
    const fw = new Firewall();
    fw.blockedIPs.add('45.33.12'); // Block a client subnet
    
    // Packet from proxy with clientIP in blocked range
    const pkt = { type: PACKET_TYPES.UDP, sourceIP: '198.51.100.5', clientIP: '45.33.12.7' };
    expect(fw.inspect(pkt).allowed).toBe(false);
    
    // Packet from proxy with clientIP NOT in blocked range
    const pkt2 = { type: PACKET_TYPES.UDP, sourceIP: '198.51.100.5', clientIP: '99.1.2.3' };
    expect(fw.inspect(pkt2).allowed).toBe(true);
  });

  it('falls back to sourceIP when clientIP not present', () => {
    const fw = new Firewall({ rateLimitEnabled: true, dashboardOpen: true, rateLimitThreshold: 2, rateLimitScope: 'ALL' });
    const baseTime = 1000;
    // Packet without clientIP (reverse proxy not enabled or client IP not preserved)
    const pkt = { type: PACKET_TYPES.UDP, sourceIP: '10.0.0.1' };
    
    expect(fw.inspect(pkt, baseTime).allowed).toBe(true); // 1
    expect(fw.inspect(pkt, baseTime + 0.1).allowed).toBe(true); // 2
    expect(fw.inspect(pkt, baseTime + 0.2).allowed).toBe(false); // 3 (blocked)
  });
});
