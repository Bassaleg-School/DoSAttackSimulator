import { PACKET_TYPES } from '../constants.js';

export default class Packet {
  constructor({
    x = 0,
    y = 0,
    speed = 0,
    type = PACKET_TYPES.HTTP_GET,
    isMalicious,
    sourceIP = '0.0.0.0',
    payloadSize = 0,
    trafficWeight = 1
  } = {}) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.type = type;
    // Default malicious flag based on packet type when not provided explicitly
    this.isMalicious = typeof isMalicious === 'boolean' ? isMalicious : type !== PACKET_TYPES.HTTP_GET;
    this.sourceIP = sourceIP;
    this.payloadSize = payloadSize;
    this.trafficWeight = trafficWeight;
  }
}
