import { describe, it, expect } from 'vitest';
import Server from '../../js/models/Server.js';
import { PACKET_TYPES, SERVER_STATUS, CONSTANTS } from '../../js/constants.js';

describe('Server', () => {
  it('volume packet increases bandwidth and decays with update', () => {
    const server = new Server();
    server.receive({ type: PACKET_TYPES.UDP, trafficWeight: 2 });
    expect(server.bandwidthUsage).toBeCloseTo(2);
    server.update(1);
    expect(server.bandwidthUsage).toBeCloseTo(0);
  });

  it('SYN adds connection, raises CPU, and TTL expiry reduces load', () => {
    const server = new Server();
    server.receive({ type: PACKET_TYPES.TCP_SYN, trafficWeight: 3 });
    expect(server.activeConnections.length).toBe(1);
    expect(server.cpuLoad).toBeCloseTo(3);
    server.update(CONSTANTS.SYN_CONNECTION_TTL_SECONDS);
    expect(server.activeConnections.length).toBe(0);
    expect(server.cpuLoad).toBeCloseTo(0);
  });

  it('status transitions: degraded at 95, crashed at 99, recovers when below 90', () => {
    const server = new Server();
    server.bandwidthUsage = 95;
    server.update(0);
    expect(server.status).toBe(SERVER_STATUS.DEGRADED);

    server.bandwidthUsage = 100;
    server.update(0);
    expect(server.status).toBe(SERVER_STATUS.CRASHED);

    server.bandwidthUsage = 85;
    server.update(0);
    expect(server.status).toBe(SERVER_STATUS.ONLINE);
  });

  it('drops HTTP_GET when crashed and happiness clamps accordingly', () => {
    const server = new Server();
    server.bandwidthUsage = 100;
    server.update(0);
    const result = server.receive({ type: PACKET_TYPES.HTTP_GET, trafficWeight: 1 });
    expect(result.allowed).toBe(false);
    expect(server.droppedPackets).toBe(1);
    expect(server.happinessScore).toBe(100 - CONSTANTS.HAPPINESS_PENALTY_PER_DROP);
  });
});
