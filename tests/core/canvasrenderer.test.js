import { describe, it, expect, beforeEach, vi } from 'vitest';
import CanvasRenderer from '../../js/core/CanvasRenderer.js';
import { PACKET_TYPES, CONSTANTS } from '../../js/constants.js';

function OrchestratorStateStub(overrides = {}) {
  const base = {
    server: { bandwidthUsage: 0, cpuLoad: 0, activeConnections: 0 },
    firewall: { loadBalancingEnabled: false },
    particles: [],
    networkNodes: {
      attacker: { label: 'ATT', badge: 'UDP' },
      proxy: { enabled: false, badge: '', badgeMode: 'ip' },
      server: { label: 'LEG', badge: '' }
    }
  };
  return {
    ...base,
    ...overrides,
    networkNodes: {
      ...base.networkNodes,
      ...(overrides.networkNodes || {})
    }
  };
}

describe('CanvasRenderer', () => {
  let canvas;
  let ctx;
  let renderer;

  beforeEach(() => {
    // Mock canvas and context
    ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      fillText: vi.fn()
    };

    canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx)
    };

    renderer = new CanvasRenderer(canvas);
  });

  it('should initialize canvas with correct dimensions', () => {
    expect(canvas.width).toBe(CONSTANTS.CANVAS_WIDTH);
    expect(canvas.height).toBe(CONSTANTS.CANVAS_HEIGHT);
  });

  it('includes scale legend entries derived from constants', () => {
    const legend = renderer.getLegendData();
    const firstLabel = legend[0].label;
    expect(firstLabel).toContain(`(${CONSTANTS.PACKET_VISUAL_SCALE_LABEL}${CONSTANTS.PACKET_VISUAL_SCALE} each)`);
  });

  it('renders network node badges for attacker, proxy, and server', () => {
    const state = OrchestratorStateStub({
      networkNodes: {
        attackerCount: 10,
        legitUserCount: 2,
        proxy: { enabled: true, badgeMode: 'count', trafficLabel: '5', publicIP: '198.51.100.10' },
        server: { label: 'LEG', badge: '20' },
        origin: { status: 'HEALTHY', ip: '203.0.113.20' }
      }
    });

    renderer.drawNetworkNodes(state);
    const labels = ctx.fillText.mock.calls.map((call) => call[0]);
    expect(labels).toEqual(expect.arrayContaining(['ATT', 'LEG', '5', 'ORIG']));
  });

  it('should clear canvas with background color', () => {
    renderer.clear();
    expect(ctx.fillStyle).toBe('#0f172a');
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, CONSTANTS.CANVAS_WIDTH, CONSTANTS.CANVAS_HEIGHT);
  });

  it('should compute pipe color based on load', () => {
    const color0 = renderer.getPipeColor(0);
    const color50 = renderer.getPipeColor(50);
    const color100 = renderer.getPipeColor(100);

    // At 0%, should be grey-ish
    expect(color0).toContain('rgb(107');
    
    // At 100%, should be red
    expect(color100).toContain('rgb(239');
    
    // At 50%, should be in between
    expect(color50).not.toBe(color0);
    expect(color50).not.toBe(color100);
  });

  it('should draw single pipe when load balancing disabled', () => {
    renderer.drawPipes(50, false);
    
    // Should draw one pipe
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.strokeRect).toHaveBeenCalled();
    
    // Check that pipe uses PIPE_HEIGHT constant
    const calls = ctx.fillRect.mock.calls;
    const pipeCall = calls.find(call => call[3] === CONSTANTS.PIPE_HEIGHT);
    expect(pipeCall).toBeDefined();
  });

  it('should draw dual pipes when load balancing enabled', () => {
    renderer.drawPipes(50, true);
    
    // Should draw two pipes (2 fillRect calls for pipes)
    const pipeCalls = ctx.fillRect.mock.calls.filter(call => call[2] === CONSTANTS.PIPE_WIDTH);
    expect(pipeCalls.length).toBe(2);
  });

  it('should draw HTTP_GET packet as green circle', () => {
    const packet = {
      type: PACKET_TYPES.HTTP_GET,
      x: 100,
      y: 200,
      isMalicious: false
    };

    renderer.drawParticle(packet);
    
    expect(ctx.fillStyle).toBe(CONSTANTS.COLOR_LEGITIMATE);
    expect(ctx.arc).toHaveBeenCalledWith(100, 200, 8, 0, Math.PI * 2);
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('should draw UDP packet as red square', () => {
    const packet = {
      type: PACKET_TYPES.UDP,
      x: 100,
      y: 200,
      isMalicious: true
    };

    renderer.drawParticle(packet);
    
    expect(ctx.fillStyle).toBe(CONSTANTS.COLOR_UDP);
    expect(ctx.fillRect).toHaveBeenCalledWith(94, 194, 12, 12);
  });

  it('should draw ICMP packet as orange square', () => {
    const packet = {
      type: PACKET_TYPES.ICMP,
      x: 100,
      y: 200,
      isMalicious: true
    };

    renderer.drawParticle(packet);
    
    expect(ctx.fillStyle).toBe(CONSTANTS.COLOR_ICMP);
    expect(ctx.fillRect).toHaveBeenCalledWith(94, 194, 12, 12);
  });

  it('should draw TCP_SYN packet as red triangle', () => {
    const packet = {
      type: PACKET_TYPES.TCP_SYN,
      x: 100,
      y: 200,
      isMalicious: true
    };

    renderer.drawParticle(packet);
    
    expect(ctx.fillStyle).toBe(CONSTANTS.COLOR_TCP_SYN);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.closePath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('should draw blocked particle in grey', () => {
    const packet = {
      type: PACKET_TYPES.UDP,
      x: 100,
      y: 200,
      isMalicious: true,
      blockedByFirewall: true
    };

    renderer.drawParticle(packet);
    
    expect(ctx.fillStyle).toBe(CONSTANTS.COLOR_BLOCKED);
  });

  it('should draw dropped particle in black', () => {
    const packet = {
      type: PACKET_TYPES.HTTP_GET,
      x: 100,
      y: 200,
      isMalicious: false,
      droppedByCollision: true
    };

    renderer.drawParticle(packet);
    
    expect(ctx.fillStyle).toBe(CONSTANTS.COLOR_TIMEOUT);
  });

  it('should draw lock icons for half-open connections', () => {
    renderer.drawLockIcon(100, 200);
    
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('should render complete scene', () => {
    const state = {
      server: {
        bandwidthUsage: 50,
        cpuLoad: 30,
        activeConnections: 5
      },
      firewall: {
        loadBalancingEnabled: false
      },
      particles: [
        { type: PACKET_TYPES.HTTP_GET, x: 100, y: 200 },
        { type: PACKET_TYPES.UDP, x: 200, y: 200 }
      ]
    };

    renderer.render(state);
    
    // Should clear canvas
    expect(ctx.fillRect).toHaveBeenCalled();
    
    // Should draw pipes
    expect(ctx.strokeRect).toHaveBeenCalled();
    
    // Should draw particles
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('should provide legend data with all packet types', () => {
    const legend = renderer.getLegendData();
    
    expect(legend.length).toBe(5);
    expect(legend[0].label).toContain('Legitimate');
    expect(legend[1].label).toContain('UDP');
    expect(legend[2].label).toContain('ICMP');
    expect(legend[3].label).toContain('TCP SYN');
    expect(legend[4].label).toContain('Half-Open');
    
    // Check shapes
    expect(legend.some(item => item.shape === 'circle')).toBe(true);
    expect(legend.some(item => item.shape === 'square')).toBe(true);
    expect(legend.some(item => item.shape === 'triangle')).toBe(true);
    expect(legend.some(item => item.shape === 'lock')).toBe(true);
  });

  it('should use canvas dimensions from constants', () => {
    expect(canvas.width).toBe(CONSTANTS.CANVAS_WIDTH);
    expect(canvas.height).toBe(CONSTANTS.CANVAS_HEIGHT);
  });
});
