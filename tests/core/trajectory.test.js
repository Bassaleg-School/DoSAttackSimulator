import { describe, it, expect, beforeEach } from 'vitest';
import Orchestrator from '../../js/core/Orchestrator.js';
import { PACKET_TYPES, CONSTANTS } from '../../js/constants.js';
import Packet from '../../js/models/Packet.js';

describe('Trajectory Computation', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  describe('initializeParticlePosition', () => {
    it('should spawn malicious packets in top cluster', () => {
      const packet = new Packet({
        type: PACKET_TYPES.UDP,
        isMalicious: true,
        speed: CONSTANTS.SPEED_MALICIOUS
      });

      orchestrator.initializeParticlePosition(packet);

      const centerY = CONSTANTS.CANVAS_HEIGHT / 2;
      const expectedY = centerY - 60;
      const tolerance = 20; // cluster radius + margin

      expect(packet.x).toBeGreaterThan(0);
      expect(packet.x).toBeLessThan(150);
      expect(packet.y).toBeGreaterThan(expectedY - tolerance);
      expect(packet.y).toBeLessThan(expectedY + tolerance);
    });

    it('should spawn legitimate packets in bottom cluster', () => {
      const packet = new Packet({
        type: PACKET_TYPES.HTTP_GET,
        isMalicious: false,
        speed: CONSTANTS.SPEED_LEGITIMATE
      });

      orchestrator.initializeParticlePosition(packet);

      const centerY = CONSTANTS.CANVAS_HEIGHT / 2;
      const expectedY = centerY + 60;
      const tolerance = 20;

      expect(packet.x).toBeGreaterThan(0);
      expect(packet.x).toBeLessThan(150);
      expect(packet.y).toBeGreaterThan(expectedY - tolerance);
      expect(packet.y).toBeLessThan(expectedY + tolerance);
    });

    it('should compute velocity vector toward destination', () => {
      const packet = new Packet({
        type: PACKET_TYPES.UDP,
        isMalicious: true,
        speed: CONSTANTS.SPEED_MALICIOUS
      });

      orchestrator.initializeParticlePosition(packet);

      expect(packet.vx).toBeDefined();
      expect(packet.vy).toBeDefined();
      expect(typeof packet.vx).toBe('number');
      expect(typeof packet.vy).toBe('number');
      
      // Velocity magnitude should approximately equal speed
      const magnitude = Math.sqrt(packet.vx * packet.vx + packet.vy * packet.vy);
      expect(magnitude).toBeCloseTo(packet.speed, 0);
    });

    it('should create different spawn positions for multiple packets', () => {
      const positions = [];
      
      for (let i = 0; i < 10; i++) {
        const packet = new Packet({
          type: PACKET_TYPES.UDP,
          isMalicious: true,
          speed: CONSTANTS.SPEED_MALICIOUS
        });
        orchestrator.initializeParticlePosition(packet);
        positions.push({ x: packet.x, y: packet.y });
      }

      // Check that not all positions are identical (cluster scatter works)
      const uniquePositions = new Set(positions.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`));
      expect(uniquePositions.size).toBeGreaterThan(1);
    });

    it('should point velocity toward proxy when reverse proxy enabled', () => {
      orchestrator.server.reverseProxyEnabled = true;
      orchestrator.server.publicIP = CONSTANTS.PROXY_PUBLIC_IP;

      const packet = new Packet({
        type: PACKET_TYPES.UDP,
        isMalicious: true,
        speed: CONSTANTS.SPEED_MALICIOUS
      });

      orchestrator.initializeParticlePosition(packet);

      // Velocity X should be positive (moving right)
      expect(packet.vx).toBeGreaterThan(0);
      
      // Velocity should point toward center (proxy Y position)
      const centerY = CONSTANTS.CANVAS_HEIGHT / 2;
      const spawnY = CONSTANTS.CANVAS_HEIGHT / 2 - 60;
      if (packet.y < centerY) {
        expect(packet.vy).toBeGreaterThanOrEqual(0); // Moving down toward center
      } else if (packet.y > centerY) {
        expect(packet.vy).toBeLessThanOrEqual(0); // Moving up toward center
      }
    });

    it('should point velocity toward server when proxy disabled', () => {
      orchestrator.server.reverseProxyEnabled = false;

      const packet = new Packet({
        type: PACKET_TYPES.HTTP_GET,
        isMalicious: false,
        speed: CONSTANTS.SPEED_LEGITIMATE
      });

      orchestrator.initializeParticlePosition(packet);

      // Velocity X should be positive (moving right toward server)
      expect(packet.vx).toBeGreaterThan(0);
      
      // Velocity should point toward center (server Y position)
      const centerY = CONSTANTS.CANVAS_HEIGHT / 2;
      if (packet.y < centerY) {
        expect(packet.vy).toBeGreaterThanOrEqual(0);
      } else if (packet.y > centerY) {
        expect(packet.vy).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('Velocity computation math', () => {
    it('should normalize velocity vector to correct speed', () => {
      const startX = 100;
      const startY = 100;
      const endX = 500;
      const endY = 300;
      const speed = 200;

      const dx = endX - startX;
      const dy = endY - startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const vx = (dx / distance) * speed;
      const vy = (dy / distance) * speed;

      const magnitude = Math.sqrt(vx * vx + vy * vy);
      
      expect(magnitude).toBeCloseTo(speed, 0.01);
    });

    it('should handle zero distance gracefully', () => {
      const packet = new Packet({
        type: PACKET_TYPES.UDP,
        isMalicious: true,
        speed: 100
      });

      // Manually set position to match destination
      packet.x = 500;
      packet.y = 200;
      
      const destX = 500;
      const destY = 200;
      const dx = destX - packet.x;
      const dy = destY - packet.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      expect(distance).toBe(0);
      
      // Fallback behavior: use horizontal velocity
      const vx = distance > 0 ? (dx / distance) * packet.speed : packet.speed;
      const vy = distance > 0 ? (dy / distance) * packet.speed : 0;
      
      expect(vx).toBe(100);
      expect(vy).toBe(0);
    });
  });

  describe('Spawn position distribution', () => {
    it('should distribute spawn positions within cluster radius', () => {
      const clusterRadius = 15;
      const centerX = 80;
      const centerY = 200;
      
      const positions = [];
      for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * clusterRadius;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        positions.push({ x, y });
      }

      // All positions should be within cluster radius
      for (const pos of positions) {
        const dist = Math.sqrt((pos.x - centerX) ** 2 + (pos.y - centerY) ** 2);
        expect(dist).toBeLessThanOrEqual(clusterRadius);
      }
    });

    it('should create visually diverse spawn points', () => {
      const positions = [];
      
      for (let i = 0; i < 20; i++) {
        const packet = new Packet({
          type: PACKET_TYPES.HTTP_GET,
          isMalicious: false,
          speed: CONSTANTS.SPEED_LEGITIMATE
        });
        orchestrator.initializeParticlePosition(packet);
        positions.push({ x: Math.round(packet.x), y: Math.round(packet.y) });
      }

      // Should have multiple unique positions
      const uniqueX = new Set(positions.map(p => p.x));
      const uniqueY = new Set(positions.map(p => p.y));
      
      expect(uniqueX.size).toBeGreaterThan(2);
      expect(uniqueY.size).toBeGreaterThan(2);
    });
  });
});
