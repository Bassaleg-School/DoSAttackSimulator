import { PACKET_TYPES, CONSTANTS } from '../constants.js';
import { randomChoice, generateSequentialIps } from '../utils.js';
import Packet from './Packet.js';

export default class GenuineTraffic {
  constructor({
    userCount = CONSTANTS.GENUINE_USER_COUNT,
    ipPrefix = CONSTANTS.GENUINE_IP_PREFIX,
    packetsPerUserPerSec = CONSTANTS.GENUINE_PACKETS_PER_USER_PER_SEC
  } = {}) {
    this.userCount = userCount;
    this.ipPrefix = ipPrefix;
    this.packetsPerUserPerSec = packetsPerUserPerSec;
    this.userIPs = generateSequentialIps(ipPrefix, userCount, 1);
    this.accumulator = 0;
  }

  spawnPacket() {
    const sourceIP = randomChoice(this.userIPs);
    return new Packet({
      type: PACKET_TYPES.HTTP_GET,
      isMalicious: false,
      sourceIP,
      payloadSize: 1,
      speed: CONSTANTS.SPEED_LEGITIMATE,
      trafficWeight: CONSTANTS.PACKET_VISUAL_SCALE
    });
  }

  spawnPackets(dtSeconds = 1) {
    const desired = this.userCount * this.packetsPerUserPerSec * dtSeconds + this.accumulator;
    const count = Math.floor(desired);
    this.accumulator = desired - count;
    const packets = [];
    for (let i = 0; i < count; i += 1) {
      packets.push(this.spawnPacket());
    }
    return packets;
  }
}
