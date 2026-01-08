import { PACKET_TYPES, CONSTANTS } from '../constants.js';

export default class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = CONSTANTS.CANVAS_WIDTH;
    this.canvas.height = CONSTANTS.CANVAS_HEIGHT;
  }

  clear() {
    this.ctx.fillStyle = '#0f172a'; // slate-950
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  getPipeColor(load) {
    // Interpolate from grey (#6B7280) at 0% to red (#EF4444) at 100%
    const greyR = 107, greyG = 114, greyB = 128;
    const redR = 239, redG = 68, redB = 68;
    
    const t = load / 100; // 0 to 1
    const r = Math.round(greyR + (redR - greyR) * t);
    const g = Math.round(greyG + (redG - greyG) * t);
    const b = Math.round(greyB + (redB - greyB) * t);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  drawPipes(load, loadBalancingEnabled, reverseProxyEnabled) {
    const pipeX = (this.canvas.width - CONSTANTS.PIPE_WIDTH) / 2;
    const centerY = this.canvas.height / 2;
    const color = this.getPipeColor(load);

    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color + '20'; // Add transparency
    this.ctx.lineWidth = 2;

    if (loadBalancingEnabled) {
      // Draw two parallel pipes
      const pipeHeight = 35;
      const gap = 10;
      
      // Top pipe
      const topY = centerY - pipeHeight - gap / 2;
      this.ctx.fillRect(pipeX, topY, CONSTANTS.PIPE_WIDTH, pipeHeight);
      this.ctx.strokeRect(pipeX, topY, CONSTANTS.PIPE_WIDTH, pipeHeight);
      
      // Bottom pipe
      const bottomY = centerY + gap / 2;
      this.ctx.fillRect(pipeX, bottomY, CONSTANTS.PIPE_WIDTH, pipeHeight);
      this.ctx.strokeRect(pipeX, bottomY, CONSTANTS.PIPE_WIDTH, pipeHeight);
    } else {
      // Draw single pipe
      const pipeY = centerY - CONSTANTS.PIPE_HEIGHT / 2;
      this.ctx.fillRect(pipeX, pipeY, CONSTANTS.PIPE_WIDTH, CONSTANTS.PIPE_HEIGHT);
      this.ctx.strokeRect(pipeX, pipeY, CONSTANTS.PIPE_WIDTH, CONSTANTS.PIPE_HEIGHT);
    }

    // v1.2: Draw Reverse Proxy Node
    if (reverseProxyEnabled) {
      const proxyX = pipeX + (CONSTANTS.PIPE_WIDTH * 0.85); // 85% down the pipe
      
      // Draw connection line to split "Public" and "Origin" segments visually
      this.ctx.strokeStyle = '#475569'; // slate-600
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.moveTo(proxyX, centerY - CONSTANTS.PIPE_HEIGHT / 2);
      this.ctx.lineTo(proxyX, centerY + CONSTANTS.PIPE_HEIGHT / 2);
      this.ctx.stroke();

      // Draw Proxy Node
      this.ctx.fillStyle = '#0f172a'; // slate-950 (background)
      this.ctx.beginPath();
      this.ctx.arc(proxyX, centerY, 24, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = '#38bdf8'; // sky-400
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(proxyX, centerY, 24, 0, Math.PI * 2);
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#38bdf8'; // sky-400
      this.ctx.font = 'bold 10px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('PROXY', proxyX, centerY);
    }
  }

  drawParticle(particle) {
    const ctx = this.ctx;
    
    // Determine color based on state
    let color;
    if (particle.blockedByFirewall) {
      color = CONSTANTS.COLOR_BLOCKED;
    } else if (particle.droppedByCollision) {
      color = CONSTANTS.COLOR_TIMEOUT;
    } else if (particle.isForwarded) {
      // v1.2: Recolor forwarded packets
      color = CONSTANTS.COLOR_FORWARDED;
    } else {
      switch (particle.type) {
        case PACKET_TYPES.HTTP_GET:
          color = CONSTANTS.COLOR_LEGITIMATE;
          break;
        case PACKET_TYPES.UDP:
          color = CONSTANTS.COLOR_UDP;
          break;
        case PACKET_TYPES.ICMP:
          color = CONSTANTS.COLOR_ICMP;
          break;
        case PACKET_TYPES.TCP_SYN:
          color = CONSTANTS.COLOR_TCP_SYN;
          break;
        default:
          color = '#FFFFFF';
      }
    }

    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    // Draw shape based on type
    switch (particle.type) {
      case PACKET_TYPES.HTTP_GET:
        // Circle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 8, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case PACKET_TYPES.UDP:
        // Square
        ctx.fillRect(particle.x - 6, particle.y - 6, 12, 12);
        break;
        
      case PACKET_TYPES.ICMP:
        // Square (orange)
        ctx.fillRect(particle.x - 6, particle.y - 6, 12, 12);
        break;
        
      case PACKET_TYPES.TCP_SYN:
        // Triangle
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y - 8);
        ctx.lineTo(particle.x - 7, particle.y + 6);
        ctx.lineTo(particle.x + 7, particle.y + 6);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }

  drawLockIcon(x, y) {
    const ctx = this.ctx;
    ctx.fillStyle = CONSTANTS.COLOR_TCP_SYN;
    ctx.strokeStyle = CONSTANTS.COLOR_TCP_SYN;
    ctx.lineWidth = 2;

    // Draw lock body (rectangle)
    ctx.fillRect(x - 6, y - 2, 12, 10);
    
    // Draw lock shackle (arc)
    ctx.beginPath();
    ctx.arc(x, y - 2, 4, Math.PI, 0, true);
    ctx.stroke();
  }

  render(state) {
    this.clear();
    
    const load = Math.max(state.server.bandwidthUsage, state.server.cpuLoad);
    this.drawPipes(load, state.firewall.loadBalancingEnabled, state.server.reverseProxyEnabled);
    
    // Draw particles
    for (const particle of state.particles) {
      this.drawParticle(particle);
    }
    
    // Draw half-open connections as lock icons on the right side
    const serverX = this.canvas.width - 50;
    const baseY = this.canvas.height / 2 - 40;
    for (let i = 0; i < Math.min(state.server.activeConnections, 10); i++) {
      const x = serverX + (i % 5) * 12;
      const y = baseY + Math.floor(i / 5) * 15;
      this.drawLockIcon(x, y);
    }
  }

  getLegendData() {
    return [
      { 
        shape: 'circle', 
        color: CONSTANTS.COLOR_LEGITIMATE, 
        label: 'Legitimate HTTP Traffic' 
      },
      { 
        shape: 'square', 
        color: CONSTANTS.COLOR_UDP, 
        label: 'UDP Flood Packet' 
      },
      { 
        shape: 'square', 
        color: CONSTANTS.COLOR_ICMP, 
        label: 'ICMP Flood Packet' 
      },
      { 
        shape: 'triangle', 
        color: CONSTANTS.COLOR_TCP_SYN, 
        label: 'TCP SYN Packet' 
      },
      { 
        shape: 'lock', 
        color: CONSTANTS.COLOR_TCP_SYN, 
        label: 'Active Half-Open Connection (shown on server)' 
      }
    ];
  }
}
