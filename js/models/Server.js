import { PACKET_TYPES, SERVER_STATUS, CONSTANTS } from '../constants.js';
import { clamp } from '../utils.js';

const LOAD_PER_PACKET = 1;
export const DROPPED_PACKET_TTL_SECONDS = 10; // v1.1: dropped packets age out after 10 seconds

export default class Server {
  constructor() {
    this.bandwidthUsage = 0;
    this.cpuLoad = 0;
    this.activeConnections = [];
    this.happinessScore = 100;
    this.droppedPackets = 0; // Legacy counter for backward compatibility
    this.droppedPacketEvents = []; // v1.1: time-windowed tracking for happiness recovery
    this.status = SERVER_STATUS.ONLINE;
    this.bandwidthCapacityMultiplier = 1; // 1.0 = baseline, higher = more capacity
    
    // v1.2: Reverse Proxy / IP addressing
    this.originIP = CONSTANTS.VICTIM_ORIGIN_IP;
    this.publicIP = CONSTANTS.VICTIM_PUBLIC_IP;
    this.reverseProxyEnabled = CONSTANTS.REVERSE_PROXY_ENABLED;
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
    // v1.1: Calculate happiness based on active (non-expired) dropped packet events
    const activeDroppedPackets = this.droppedPacketEvents.length;
    this.happinessScore = clamp(
      100 - activeDroppedPackets * CONSTANTS.HAPPINESS_PENALTY_PER_DROP,
      0,
      100
    );
    // Keep legacy counter in sync for backward compatibility
    this.droppedPackets = activeDroppedPackets;
  }

  receive(packet) {
    const weight = packet.trafficWeight || 1;

    if (packet.type === PACKET_TYPES.HTTP_GET) {
      const load = this.getCurrentLoad();
      if (this.status === SERVER_STATUS.CRASHED || load >= CONSTANTS.SERVER_CRASHED_THRESHOLD) {
        // v1.1: Track dropped packet with TTL for recovery
        this.recordDroppedPacket();
        return { allowed: false, reason: 'CRASHED' };
      }
      return { allowed: true, reason: 'OK' };
    }

    // Volume attacks (UDP/ICMP) target bandwidth - affected by bandwidth capacity
    if (packet.type === PACKET_TYPES.UDP || packet.type === PACKET_TYPES.ICMP) {
      const effectiveLoad = (weight * LOAD_PER_PACKET) / this.bandwidthCapacityMultiplier;
      this.bandwidthUsage = clamp(this.bandwidthUsage + effectiveLoad, 0, 100);
    } 
    // Protocol attacks (TCP SYN) target CPU/RAM - NOT affected by bandwidth capacity
    else if (packet.type === PACKET_TYPES.TCP_SYN) {
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

    // v1.1: Age out old dropped packet events for happiness recovery
    const remainingDrops = [];
    for (const drop of this.droppedPacketEvents) {
      const ttl = drop.ttl - dtSeconds;
      if (ttl > 0) {
        remainingDrops.push({ ttl });
      }
    }
    this.droppedPacketEvents = remainingDrops;

    this.updateStatus();
    this.updateHappiness();
  }

  // v1.1: Reset method to restore initial state
  reset() {
    this.bandwidthUsage = 0;
    this.cpuLoad = 0;
    this.activeConnections = [];
    this.happinessScore = 100;
    this.droppedPackets = 0;
    this.droppedPacketEvents = [];
    this.status = SERVER_STATUS.ONLINE;
    this.bandwidthCapacityMultiplier = 1;
    // v1.2: Reset proxy state
    this.originIP = CONSTANTS.VICTIM_ORIGIN_IP;
    this.publicIP = CONSTANTS.VICTIM_PUBLIC_IP;
    this.reverseProxyEnabled = CONSTANTS.REVERSE_PROXY_ENABLED;
  }
  
  // v1.2: Toggle reverse proxy
  setReverseProxyEnabled(enabled) {
    this.reverseProxyEnabled = !!enabled; // Coerce to boolean
    if (this.reverseProxyEnabled) {
      this.publicIP = CONSTANTS.PROXY_PUBLIC_IP;
    } else {
      this.publicIP = CONSTANTS.VICTIM_PUBLIC_IP;
    }
  }
  
  // v1.1: Record a dropped packet with TTL for happiness recovery
  recordDroppedPacket() {
    this.droppedPacketEvents.push({ ttl: DROPPED_PACKET_TTL_SECONDS });
    this.updateHappiness();
  }
}
