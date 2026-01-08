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
    this.server = new Server();
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
      this.addParticles(genuinePackets);
    }

    // Spawn attack traffic if attacking
    if (this.attacker.isAttacking) {
      const { packets: attackPackets } = this.attacker.spawnPackets(dt);
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
          this.server.droppedPackets += 1;
          this.server.updateHappiness();
          this.logAnalyzerEvent({
            ip: particle.sourceIP,
            type: particle.type,
            action: 'DROPPED',
            reason: 'COLLISION'
          });
        } else {
          remaining.push(particle);
        }
      }
    }

    this.particles = remaining;
  }

  processArrival(particle) {
    // Firewall inspection
    const firewallResult = this.firewall.inspect(particle);
    
    if (!firewallResult.allowed) {
      // Firewall blocked packet
      particle.blockedByFirewall = true;
      this.logAnalyzerEvent({
        ip: particle.sourceIP,
        type: particle.type,
        action: 'BLOCKED',
        reason: firewallResult.reason
      });
      
      // If legitimate packet was blocked, count as dropped
      if (!particle.isMalicious) {
        this.server.droppedPackets += 1;
        this.server.updateHappiness();
      }
      return;
    }

    // Server processing (if not crashed)
    if (this.server.status !== 'CRASHED') {
      const serverResult = this.server.receive(particle);
      
      if (serverResult.allowed) {
        this.logAnalyzerEvent({
          ip: particle.sourceIP,
          type: particle.type,
          action: 'ALLOWED',
          reason: serverResult.reason
        });
      } else {
        this.logAnalyzerEvent({
          ip: particle.sourceIP,
          type: particle.type,
          action: 'DROPPED',
          reason: serverResult.reason
        });
      }
    } else {
      // Crash short-circuit: server crashed, all packets are dropped
      if (!particle.isMalicious) {
        this.server.droppedPackets += 1;
        this.server.updateHappiness();
      }
      this.logAnalyzerEvent({
        ip: particle.sourceIP,
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
