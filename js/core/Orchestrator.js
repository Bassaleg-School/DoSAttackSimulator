import { CONSTANTS } from '../constants.js';
import GenuineTraffic from '../models/GenuineTraffic.js';
import Attacker from '../models/Attacker.js';
import Server from '../models/Server.js';
import Firewall from '../models/Firewall.js';

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
  }

  reset() {
    this.genuineTraffic = new GenuineTraffic();
    this.attacker = new Attacker();
    this.server.reset(); // v1.1: Use reset method
    this.firewall = new Firewall();
    this.particles = [];
    this.analyzerLogs = [];
    this.analyzerLogBudget = 0;
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
      // Initialize particle position at left edge of canvas
      packet.x = 0;
      packet.y = CONSTANTS.CANVAS_HEIGHT / 2;
      this.particles.push(packet);
    }
  }

  updateParticles(dt) {
    const remaining = [];
    const pipeEndX = CONSTANTS.CANVAS_WIDTH;

    for (const particle of this.particles) {
      // Move particle
      particle.x += particle.speed * dt;

      // Check if particle has reached the server
      if (particle.x >= pipeEndX) {
        this.processArrival(particle);
      } else {
        // Collision drop rule: if bandwidth > 95% and packet is legitimate, drop it
        if (!particle.isMalicious && this.server.bandwidthUsage > CONSTANTS.BANDWIDTH_COLLISION_THRESHOLD) {
          // Mark as dropped due to timeout (collision/congestion)
          particle.droppedByCollision = true;
          // v1.1: Use method to track dropped packet with TTL
          this.server.droppedPacketEvents.push({ ttl: 10 }); // same TTL as in Server.js
          this.server.updateHappiness();
          this.logAnalyzerEvent({
            ip: particle.sourceIP,
            type: particle.type,
            action: 'DROPPED',
            reason: 'COLLISION'
          });
          // Keep particle for one more frame so users can see it turn black
          remaining.push(particle);
        } else if (particle.droppedByCollision) {
          // Particle was marked as dropped in previous frame, now remove it
          // (don't add to remaining)
        } else {
          remaining.push(particle);
        }
      }
    }

    this.particles = remaining;
  }

  processArrival(particle) {
    // v1.2: Check if packet is targeting the correct IP
    // If reverse proxy is enabled and origin shielding is active, only packets to public IP or from proxy reach server
    if (this.server.reverseProxyEnabled) {
      // If packet destination doesn't match public IP, it doesn't reach the proxy
      if (particle.destinationIP !== this.server.publicIP) {
        // Packet missed - targeting wrong IP
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
      // Change sourceIP to proxy egress IP
      const proxyEgressHost = Math.floor(Math.random() * 256);
      particle.sourceIP = `${CONSTANTS.PROXY_EGRESS_IP_PREFIX}.${proxyEgressHost}`;
      particle.isForwarded = true; // Mark for visualization
    } else if (particle.destinationIP !== this.server.publicIP) {
      // No proxy, packet must match public IP
      this.logAnalyzerEvent({
        ip: particle.sourceIP,
        type: particle.type,
        action: 'MISSED',
        reason: 'WRONG_IP'
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
        reason: firewallResult.reason
      });
      
      // If legitimate packet was blocked, count as dropped (v1.1: with TTL)
      if (!particle.isMalicious) {
        this.server.droppedPacketEvents.push({ ttl: 10 }); // same TTL as in Server.js
        this.server.updateHappiness();
      }
      return;
    }

    // Server processing (if not crashed)
    if (this.server.status !== 'CRASHED') {
      const serverResult = this.server.receive(particle);
      
      if (serverResult.allowed) {
        this.logAnalyzerEvent({
          ip: particle.clientIP || particle.sourceIP,
          type: particle.type,
          action: 'ALLOWED',
          reason: serverResult.reason
        });
      } else {
        this.logAnalyzerEvent({
          ip: particle.clientIP || particle.sourceIP,
          type: particle.type,
          action: 'DROPPED',
          reason: serverResult.reason
        });
      }
    } else {
      // Crash short-circuit: server crashed, all packets are dropped
      if (!particle.isMalicious) {
        this.server.droppedPacketEvents.push({ ttl: 10 }); // v1.1: with TTL
        this.server.updateHappiness();
      }
      this.logAnalyzerEvent({
        ip: particle.clientIP || particle.sourceIP,
        type: particle.type,
        action: 'DROPPED',
        reason: 'SERVER_CRASHED'
      });
    }
  }

  logAnalyzerEvent(event) {
    // Prioritize blocked/dropped events over allowed
    const isHighPriority = event.action === 'BLOCKED' || event.action === 'DROPPED';
    
    if (isHighPriority) {
      // Always log high priority events if we have any budget
      if (this.analyzerLogBudget >= 1) {
        this.analyzerLogs.unshift({
          ...event,
          timestamp: Date.now()
        });
        this.analyzerLogBudget -= 1;
      }
    } else {
      // Sample allowed events within remaining budget
      if (this.analyzerLogBudget >= 1) {
        this.analyzerLogs.unshift({
          ...event,
          timestamp: Date.now()
        });
        this.analyzerLogBudget -= 1;
      }
    }

    // Keep only last 50 entries
    if (this.analyzerLogs.length > CONSTANTS.UI_LOG_MAX_ENTRIES) {
      this.analyzerLogs = this.analyzerLogs.slice(0, CONSTANTS.UI_LOG_MAX_ENTRIES);
    }
  }

  getState() {
    return {
      server: {
        bandwidthUsage: this.server.bandwidthUsage,
        cpuLoad: this.server.cpuLoad,
        status: this.server.status,
        happinessScore: this.server.happinessScore,
        droppedPackets: this.server.droppedPackets,
        activeConnections: this.server.activeConnections.length
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
      isSimulationRunning: this.isSimulationRunning
    };
  }
}
