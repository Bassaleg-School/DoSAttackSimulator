import { PROTOCOLS, PACKET_TYPES, CONSTANTS } from '../constants.js';
import { extractSubnet } from '../utils.js';

const RATE_LIMIT_WINDOW_SECONDS = 1;

function mapTypeToProtocol(type) {
  if (type === PACKET_TYPES.HTTP_GET || type === PACKET_TYPES.TCP_SYN) return PROTOCOLS.TCP;
  if (type === PACKET_TYPES.UDP) return PROTOCOLS.UDP;
  if (type === PACKET_TYPES.ICMP) return PROTOCOLS.ICMP;
  return undefined;
}

export default class Firewall {
  constructor({
    rateLimitThreshold = CONSTANTS.RATE_LIMIT_DEFAULT,
    rateLimitScope = 'ALL',
    rateLimitEnabled = false,
    dashboardOpen = false,
    loadBalancingEnabled = false
  } = {}) {
    this.blockedProtocols = new Set();
    this.blockedIPs = new Set();
    this.detectedSubnets = new Set();
    this.rateLimitThreshold = rateLimitThreshold;
    this.rateLimitScope = rateLimitScope; // 'ALL' or specific protocol
    this.rateLimitEnabled = rateLimitEnabled;
    this.dashboardOpen = dashboardOpen;
    this.loadBalancingEnabled = loadBalancingEnabled;
    this.perIpCounters = new Map();
  }

  isRateLimitActive() {
    return this.rateLimitEnabled && this.dashboardOpen;
  }

  protocolMatchesScope(protocol) {
    return this.rateLimitScope === 'ALL' || this.rateLimitScope === protocol;
  }

  getCounterKey(ip, protocol) {
    return this.rateLimitScope === 'ALL' ? `${ip}|ALL` : `${ip}|${protocol}`;
  }

  resetWindowIfNeeded(counter, nowSeconds) {
    if (nowSeconds - counter.windowStart >= RATE_LIMIT_WINDOW_SECONDS) {
      counter.windowStart = nowSeconds;
      counter.count = 0;
    }
  }

  inspect(packet, nowSeconds = Date.now() / 1000) {
    const protocol = mapTypeToProtocol(packet.type);
    const subnet = extractSubnet(packet.sourceIP);
    this.detectedSubnets.add(subnet);

    if (protocol && this.blockedProtocols.has(protocol)) {
      return { allowed: false, reason: 'BLOCK_PROTOCOL' };
    }

    if (this.blockedIPs.has(subnet)) {
      return { allowed: false, reason: 'BLOCK_IP' };
    }

    if (this.isRateLimitActive() && protocol && this.protocolMatchesScope(protocol)) {
      const key = this.getCounterKey(packet.sourceIP, protocol);
      const counter = this.perIpCounters.get(key) || { count: 0, windowStart: nowSeconds };
      this.resetWindowIfNeeded(counter, nowSeconds);
      counter.count += 1;
      this.perIpCounters.set(key, counter);
      if (counter.count > this.rateLimitThreshold) {
        return { allowed: false, reason: 'RATE_LIMIT' };
      }
    }

    return { allowed: true, reason: 'ALLOWED' };
  }

  getDetectedSubnets() {
    return Array.from(this.detectedSubnets);
  }
}
