import { ATTACK_TYPES, CONSTANTS, PACKET_TYPES } from '../constants.js';
import { generateRandomIP, extractSubnet, randomChoice } from '../utils.js';
import Packet from './Packet.js';

function randomHostOctet() {
  return Math.floor(Math.random() * 256);
}

export default class Attacker {
  constructor({
    deviceCount = CONSTANTS.DEVICE_COUNT_MIN,
    attackType = ATTACK_TYPES.UDP,
    targetIP = CONSTANTS.VICTIM_IP,
    bandwidthMultiplier = CONSTANTS.BANDWIDTH_MULTIPLIER_MIN,
    isAttacking = false
  } = {}) {
    this.deviceCount = deviceCount;
    this.attackType = attackType;
    this.targetIP = targetIP;
    this.bandwidthMultiplier = bandwidthMultiplier;
    this.isAttacking = isAttacking;
    this.botnetRanges = [];
    this.accumulator = 0;
  }

  generateBotnetRanges() {
    const subnetCount = Math.max(1, Math.ceil(this.deviceCount / CONSTANTS.DEVICES_PER_SUBNET));
    const ranges = new Set();
    let attempts = 0;
    // Guarded loop to avoid infinite attempts when randomness is mocked or produces repeats
    while (ranges.size < subnetCount && attempts < subnetCount * 20) {
      const ip = generateRandomIP(CONSTANTS.GENUINE_IP_PREFIX);
      const subnet = extractSubnet(ip);
      if (subnet === CONSTANTS.GENUINE_IP_PREFIX) {
        attempts += 1;
        continue;
      }
      ranges.add(subnet);
      attempts += 1;
    }
    // Deterministic fallback in case randomness produced insufficient unique subnets
    let filler = 1;
    while (ranges.size < subnetCount) {
      ranges.add(`10.${filler}.0`);
      filler += 1;
    }
    this.botnetRanges = Array.from(ranges);
    return this.botnetRanges;
  }

  getBaseRate() {
    switch (this.attackType) {
      case ATTACK_TYPES.ICMP:
        return CONSTANTS.ATTACK_RATE_ICMP;
      case ATTACK_TYPES.TCP_SYN:
        return CONSTANTS.ATTACK_RATE_TCP_SYN;
      case ATTACK_TYPES.UDP:
      default:
        return CONSTANTS.ATTACK_RATE_UDP;
    }
  }

  computeDesiredPps() {
    return this.deviceCount * this.getBaseRate() * this.bandwidthMultiplier;
  }

  spawnPacket() {
    if (!this.botnetRanges.length) {
      this.generateBotnetRanges();
    }
    const subnet = randomChoice(this.botnetRanges);
    const sourceIP = `${subnet}.${randomHostOctet()}`;
    return new Packet({
      type: this.attackType,
      isMalicious: true,
      sourceIP,
      payloadSize: 1,
      speed: CONSTANTS.SPEED_MALICIOUS
    });
  }

  spawnPackets(dtSeconds = 1) {
    const desiredPps = this.computeDesiredPps();
    const visualPps = Math.min(desiredPps, CONSTANTS.VISUAL_SPAWN_CAP_PER_SECOND);
    const weight = visualPps === 0 ? 1 : desiredPps / visualPps;
    const desiredCount = visualPps * dtSeconds + this.accumulator;
    const count = Math.floor(desiredCount);
    this.accumulator = desiredCount - count;

    const packets = [];
    for (let i = 0; i < count; i += 1) {
      const packet = this.spawnPacket();
      packet.trafficWeight = weight;
      packets.push(packet);
    }
    return { packets, desiredPps, visualPps, trafficWeight: weight };
  }
}
