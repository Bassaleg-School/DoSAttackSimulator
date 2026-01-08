import { CONSTANTS } from '../constants.js';
import GenuineTraffic from '../models/GenuineTraffic.js';
import Attacker from '../models/Attacker.js';
import Server from '../models/Server.js';
import Firewall from '../models/Firewall.js';
import { abbreviateNumber } from '../utils.js';

export default class Orchestrator {
  constructor() {
    this.genuineTraffic = new GenuineTraffic();
    this.attacker = new Attacker();
    this.server = new Server();
    this.firewall = new Firewall();
    this.particles = [];
    this.analyzerLogs = [];
    this.analyzerLogBudget = 0;
    this.isSimulationRunning = false;
    this.proxyBadgeMode = 'ip';
  }

  reset() {
    this.genuineTraffic = new GenuineTraffic();
    this.attacker = new Attacker();
    this.server.reset(); // v1.1: Use reset method
    this.firewall = new Firewall();
    this.particles = [];
    this.analyzerLogs = [];
    this.analyzerLogBudget = 0;
    this.proxyBadgeMode = 'ip';
  }

  update(dt) {
    // Reset analyzer log budget each second
    this.analyzerLogBudget += dt * CONSTANTS.UI_ANALYZER_LOG_MAX_PER_SECOND;
    if (this.analyzerLogBudget > CONSTANTS.UI_ANALYZER_LOG_MAX_PER_SECOND) {
      this.analyzerLogBudget = CONSTANTS.UI_ANALYZER_LOG_MAX_PER_SECOND;
    }

    // Server decay
    this.server.update(dt);

    // Spawn genuine traffic if simulation is running
    if (this.isSimulationRunning) {
      const genuinePackets = this.genuineTraffic.spawnPackets(dt);
      // v1.2: Set destination IP to server's public IP
      genuinePackets.forEach(p => p.destinationIP = this.server.publicIP);
      this.addParticles(genuinePackets);
    }

    // Spawn attack traffic if attacking
    if (this.attacker.isAttacking) {
      const { packets: attackPackets } = this.attacker.spawnPackets(dt);
      // v1.2: Set destination IP to attacker's target IP
      attackPackets.forEach(p => p.destinationIP = this.attacker.targetIP);
      this.addParticles(attackPackets);
    }

    // Update particle positions and process arrivals
    this.updateParticles(dt);
  }

  addParticles(newPackets) {
    for (const packet of newPackets) {
      if (this.particles.length >= CONSTANTS.MAX_ACTIVE_PARTICLES) {
        break;
      }
      // Initialize particle position based on cluster
      this.initializeParticlePosition(packet);
      this.particles.push(packet);
    }
  }

  initializeParticlePosition(packet) {
    const centerY = CONSTANTS.CANVAS_HEIGHT / 2;
    const leftX = 80;
    const rightX = CONSTANTS.CANVAS_WIDTH - 80;
    
    // Determine spawn cluster based on packet type
    let spawnX, spawnY, destX, destY;
    
    if (packet.isMalicious) {
      // Attacker cluster (top-left)
      spawnX = leftX;
      spawnY = centerY - 60;
    } else {
      // Legitimate user cluster (bottom-left)
      spawnX = leftX;
      spawnY = centerY + 60;
    }
    
    // Add cluster scatter for multi-device visualization
    const clusterRadius = 15;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * clusterRadius;
    spawnX += Math.cos(angle) * distance;
    spawnY += Math.sin(angle) * distance;
    
    // Determine destination
    if (this.server.reverseProxyEnabled) {
      // Destination is proxy node when proxy enabled
      const pipeStartX = (CONSTANTS.CANVAS_WIDTH - CONSTANTS.PIPE_WIDTH) / 2;
      destX = pipeStartX + (CONSTANTS.PIPE_WIDTH * 0.85);
      destY = centerY;
    } else {
      // Destination is server (right side)
      destX = rightX;
      destY = centerY;
    }
    
    // Set position
    packet.x = spawnX;
    packet.y = spawnY;
    
    // Compute velocity vector
    const dx = destX - spawnX;
    const dy = destY - spawnY;
    const distanceTotal = Math.sqrt(dx * dx + dy * dy);
    
    if (distanceTotal > 0) {
      const speed = packet.speed || CONSTANTS.SPEED_MALICIOUS;
      packet.vx = (dx / distanceTotal) * speed;
      packet.vy = (dy / distanceTotal) * speed;
    } else {
      packet.vx = packet.speed || CONSTANTS.SPEED_MALICIOUS;
      packet.vy = 0;
    }
  }

  updateParticles(dt) {
    const remaining = [];
    const pipeEndX = CONSTANTS.CANVAS_WIDTH;
    const pipeStartX = (CONSTANTS.CANVAS_WIDTH - CONSTANTS.PIPE_WIDTH) / 2;
    const proxyX = pipeStartX + (CONSTANTS.PIPE_WIDTH * 0.85);
    const rightX = CONSTANTS.CANVAS_WIDTH - 80;

    for (const particle of this.particles) {
      // Use velocity vector if available, otherwise fall back to horizontal movement
      if (particle.vx !== undefined && particle.vy !== undefined) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        
        // Update destination after passing proxy
        if (this.server.reverseProxyEnabled && particle.hasPassedProxy && !particle.destinationUpdated) {
          particle.destinationUpdated = true;
          const centerY = CONSTANTS.CANVAS_HEIGHT / 2;
          const dx = rightX - particle.x;
          const dy = centerY - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 0) {
            const speed = particle.speed || CONSTANTS.SPEED_MALICIOUS;
            particle.vx = (dx / distance) * speed;
            particle.vy = (dy / distance) * speed;
          }
        }
      } else {
        particle.x += particle.speed * dt;
      }

      if (this.processProxyCheckpoint(particle, proxyX)) {
        continue;
      }

      if (this.processServerEdge(particle, rightX)) {
        continue;
      }

      if (this.handleCollision(particle, remaining)) {
        continue;
      }

      remaining.push(particle);
    }

    this.particles = remaining;
  }

  processProxyCheckpoint(particle, proxyX) {
    if (!this.server.reverseProxyEnabled || particle.hasPassedProxy || particle.x < proxyX) {
      return false;
    }

    particle.hasPassedProxy = true;
    this.runInspection(particle);
    return particle.blockedByFirewall || particle.missedTarget;
  }

  processServerEdge(particle, pipeEndX) {
    if (particle.x < pipeEndX) {
      return false;
    }

    if (!this.server.reverseProxyEnabled) {
      this.runInspection(particle);
    }

    if (!particle.blockedByFirewall && !particle.missedTarget && !particle.droppedByCollision) {
      this.processServerArrival(particle);
    }

    return true;
  }

  handleCollision(particle, remaining) {
    const shouldDropLegit = !particle.isMalicious
      && !particle.blockedByFirewall
      && !particle.missedTarget
      && this.server.bandwidthUsage > CONSTANTS.BANDWIDTH_COLLISION_THRESHOLD;

    if (shouldDropLegit) {
      particle.droppedByCollision = true;
      this.server.recordDroppedPacket(particle.trafficWeight || 1);
      this.logAnalyzerEvent({
        ip: particle.sourceIP,
        type: particle.type,
        action: 'DROPPED',
        reason: 'COLLISION',
        weight: particle.trafficWeight
      });
      remaining.push(particle);
      return true;
    }

    return particle.droppedByCollision;
  }

  // Exposed for tests: process a single packet arrival through proxy + server path
  processArrival(particle) {
    // If proxy was never crossed (e.g., direct invocation), flag it to reuse proxy logic
    if (this.server.reverseProxyEnabled && !particle.hasPassedProxy) {
      particle.hasPassedProxy = true;
    }

    this.runInspection(particle);

    if (!particle.blockedByFirewall && !particle.missedTarget && !particle.droppedByCollision) {
      this.processServerArrival(particle);
    }
  }

  runInspection(particle) {
    // v1.2: Check if packet is targeting the correct IP
    // If reverse proxy is enabled, only packets to public IP reach the proxy
    if (this.server.reverseProxyEnabled) {
      // If packet destination doesn't match public IP, it doesn't reach the proxy
      if (particle.destinationIP !== this.server.publicIP) {
        particle.missedTarget = true;
        this.logAnalyzerEvent({
          ip: particle.sourceIP,
          type: particle.type,
          action: 'MISSED',
          reason: 'WRONG_IP'
        });
        return;
      }
      
      // Packet reached proxy - mark as forwarded and preserve clientIP
      if (!particle.clientIP) {
        particle.clientIP = particle.sourceIP;
      }
      // Change sourceIP to proxy egress IP (random host in proxy egress network)
      const proxyEgressHost = Math.floor(Math.random() * 254) + 1; // 1-254 (valid host addresses)
      particle.sourceIP = `${CONSTANTS.PROXY_EGRESS_IP_PREFIX}.${proxyEgressHost}`;
      particle.isForwarded = true; // Mark for visualization
    } else if (particle.destinationIP !== this.server.publicIP) {
      // No proxy, packet must match public IP
      particle.missedTarget = true;
      this.logAnalyzerEvent({
        ip: particle.sourceIP,
        type: particle.type,
        action: 'MISSED',
        reason: 'WRONG_IP',
        weight: particle.trafficWeight
      });
      return;
    }
    
    // Firewall inspection
    const firewallResult = this.firewall.inspect(particle);
    
    if (!firewallResult.allowed) {
      // Firewall blocked packet
      particle.blockedByFirewall = true;
      this.logAnalyzerEvent({
        ip: particle.clientIP || particle.sourceIP,
        type: particle.type,
        action: 'BLOCKED',
        reason: firewallResult.reason,
        weight: particle.trafficWeight
      });
      
      // If legitimate packet was blocked, count as dropped
      if (!particle.isMalicious) {
        this.server.recordDroppedPacket(particle.trafficWeight || 1);
      }
    }
  }

  processServerArrival(particle) {
    if (this.server.status === 'CRASHED') {
      if (!particle.isMalicious) {
        this.server.recordDroppedPacket(particle.trafficWeight || 1);
      }
      this.logAnalyzerEvent({
        ip: particle.clientIP || particle.sourceIP,
        type: particle.type,
        action: 'DROPPED',
        reason: 'SERVER_CRASHED',
        weight: particle.trafficWeight
      });
    } else {
      const serverResult = this.server.receive(particle);
      const action = serverResult.allowed ? 'ALLOWED' : 'DROPPED';

      this.logAnalyzerEvent({
        ip: particle.clientIP || particle.sourceIP,
        type: particle.type,
        action,
        reason: serverResult.reason,
        weight: particle.trafficWeight
      });
    }
  }

  logAnalyzerEvent(event) {
    if (this.analyzerLogBudget < 1) return;

    this.analyzerLogs.unshift({
      ...event,
      timestamp: Date.now()
    });
    this.analyzerLogBudget -= 1;

    if (this.analyzerLogs.length > CONSTANTS.UI_LOG_MAX_ENTRIES) {
      this.analyzerLogs = this.analyzerLogs.slice(0, CONSTANTS.UI_LOG_MAX_ENTRIES);
    }
  }

  getState() {
    const aggregates = this.computeAggregates();
    return {
      server: {
        bandwidthUsage: this.server.bandwidthUsage,
        cpuLoad: this.server.cpuLoad,
        status: this.server.status,
        happinessScore: this.server.happinessScore,
        droppedPackets: this.server.droppedPackets,
        activeConnections: this.server.activeConnections.length,
        activeConnectionWeight: this.server.getActiveConnectionWeight(),
        publicIP: this.server.publicIP,
        originIP: this.server.originIP,
        reverseProxyEnabled: this.server.reverseProxyEnabled
      },
      attacker: {
        deviceCount: this.attacker.deviceCount,
        attackType: this.attacker.attackType,
        isAttacking: this.attacker.isAttacking,
        botnetRanges: this.attacker.botnetRanges
      },
      firewall: {
        blockedProtocols: Array.from(this.firewall.blockedProtocols),
        blockedIPs: Array.from(this.firewall.blockedIPs),
        rateLimitEnabled: this.firewall.rateLimitEnabled,
        rateLimitThreshold: this.firewall.rateLimitThreshold,
        loadBalancingEnabled: this.firewall.loadBalancingEnabled,
        detectedSubnets: this.firewall.getDetectedSubnets()
      },
      particles: this.particles,
      analyzerLogs: this.analyzerLogs,
      isSimulationRunning: this.isSimulationRunning,
      aggregates,
      networkNodes: {
        attackerCount: this.attacker.deviceCount,
        legitUserCount: CONSTANTS.GENUINE_USER_COUNT,
        proxy: {
          enabled: this.server.reverseProxyEnabled,
          publicIP: this.server.publicIP,
          badgeMode: this.proxyBadgeMode,
          trafficLabel: abbreviateNumber(aggregates.activeWeighted)
        },
        origin: {
          ip: this.server.originIP,
          status: this.server.status
        }
      }
    };
  }

  computeAggregates() {
    const aggregates = {
      activeWeighted: 0,
      activeLegitWeighted: 0,
      activeMaliciousWeighted: 0,
      activeByType: {},
      halfOpenWeighted: this.server.getActiveConnectionWeight()
    };

    for (const particle of this.particles) {
      const weight = particle.trafficWeight || 1;
      aggregates.activeWeighted += weight;
      const typeKey = particle.type;
      aggregates.activeByType[typeKey] = (aggregates.activeByType[typeKey] || 0) + weight;
      if (particle.isMalicious) {
        aggregates.activeMaliciousWeighted += weight;
      } else {
        aggregates.activeLegitWeighted += weight;
      }
    }

    return aggregates;
  }

  setProxyBadgeMode(mode) {
    this.proxyBadgeMode = mode === 'count' ? 'count' : 'ip';
  }
}
