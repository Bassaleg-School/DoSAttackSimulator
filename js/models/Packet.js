import { PACKET_TYPES, CONSTANTS } from '../constants.js';

export default class Packet {
  constructor({
    x = 0,
    y = 0,
    vx = undefined, // velocity x component (set by Orchestrator during initialization)
    vy = undefined, // velocity y component (set by Orchestrator during initialization)
    speed = 0,
    type = PACKET_TYPES.HTTP_GET,
    isMalicious,
    sourceIP = '0.0.0.0',
    destinationIP = '0.0.0.0', // v1.2: target IP for this packet
    clientIP = null, // v1.2: original source IP when traffic is proxied
    payloadSize = 0,
    trafficWeight = CONSTANTS.PACKET_VISUAL_SCALE
  } = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.speed = speed;
    this.type = type;
    // Default malicious flag based on packet type when not provided explicitly
    this.isMalicious = typeof isMalicious === 'boolean' ? isMalicious : type !== PACKET_TYPES.HTTP_GET;
    this.sourceIP = sourceIP;
    this.destinationIP = destinationIP; // v1.2
    this.clientIP = clientIP; // v1.2
    this.payloadSize = payloadSize;
    this.trafficWeight = trafficWeight;
  }
}
