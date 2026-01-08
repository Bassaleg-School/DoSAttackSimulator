import { PACKET_TYPES, SERVER_STATUS, CONSTANTS } from '../constants.js';
import { clamp } from '../utils.js';

const LOAD_PER_PACKET = 1;

export default class Server {
  constructor() {
    this.bandwidthUsage = 0;
    this.cpuLoad = 0;
    this.activeConnections = [];
    this.happinessScore = 100;
    this.droppedPackets = 0;
    this.status = SERVER_STATUS.ONLINE;
    this.bandwidthCapacityMultiplier = 1.0; // 1.0 = baseline, higher = more capacity
  }

  getCurrentLoad() {
    return Math.max(this.bandwidthUsage, this.cpuLoad);
  }

  updateStatus() {
    const load = this.getCurrentLoad();
    if (this.status === SERVER_STATUS.CRASHED && load >= CONSTANTS.SERVER_RECOVERY_THRESHOLD) {
      this.status = SERVER_STATUS.CRASHED;
      return;
    }

    if (load >= CONSTANTS.SERVER_CRASHED_THRESHOLD) {
      this.status = SERVER_STATUS.CRASHED;
    } else if (load >= CONSTANTS.SERVER_DEGRADED_THRESHOLD) {
      this.status = SERVER_STATUS.DEGRADED;
    } else {
      this.status = SERVER_STATUS.ONLINE;
    }
  }

  updateHappiness() {
    this.happinessScore = clamp(
      100 - this.droppedPackets * CONSTANTS.HAPPINESS_PENALTY_PER_DROP,
      0,
      100
    );
  }

  receive(packet) {
    const weight = packet.trafficWeight || 1;

    if (packet.type === PACKET_TYPES.HTTP_GET) {
      const load = this.getCurrentLoad();
      if (this.status === SERVER_STATUS.CRASHED || load >= CONSTANTS.SERVER_CRASHED_THRESHOLD) {
        this.droppedPackets += 1;
        this.updateHappiness();
        return { allowed: false, reason: 'CRASHED' };
      }
      return { allowed: true, reason: 'OK' };
    }

    if (packet.type === PACKET_TYPES.UDP || packet.type === PACKET_TYPES.ICMP) {
      const effectiveLoad = (weight * LOAD_PER_PACKET) / this.bandwidthCapacityMultiplier;
      this.bandwidthUsage = clamp(this.bandwidthUsage + effectiveLoad, 0, 100);
    } else if (packet.type === PACKET_TYPES.TCP_SYN) {
      if (this.activeConnections.length < CONSTANTS.MAX_ACTIVE_CONNECTIONS) {
        this.activeConnections.push({ ttl: CONSTANTS.SYN_CONNECTION_TTL_SECONDS, weight });
        this.cpuLoad = clamp(this.cpuLoad + weight * LOAD_PER_PACKET, 0, 100);
      }
    }

    this.updateStatus();
    return { allowed: true, reason: 'ACCEPTED' };
  }

  update(dtSeconds = 1) {
    this.bandwidthUsage = clamp(
      this.bandwidthUsage - CONSTANTS.BANDWIDTH_DECAY_RATE * dtSeconds,
      0,
      100
    );
    this.cpuLoad = clamp(this.cpuLoad - CONSTANTS.CPU_DECAY_RATE * dtSeconds, 0, 100);

    const remaining = [];
    for (const conn of this.activeConnections) {
      const ttl = conn.ttl - dtSeconds;
      if (ttl > 0) {
        remaining.push({ ...conn, ttl });
      } else {
        this.cpuLoad = clamp(this.cpuLoad - conn.weight * LOAD_PER_PACKET, 0, 100);
      }
    }
    this.activeConnections = remaining;

    this.updateStatus();
    this.updateHappiness();
  }
}
