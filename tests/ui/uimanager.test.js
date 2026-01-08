import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import UIManager from '../../js/ui/UIManager.js';
import { SERVER_STATUS } from '../../js/constants.js';

describe('UIManager', () => {
  let dom;
  let document;
  let uiManager;

  beforeEach(() => {
    // Create minimal DOM structure
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <span id="server-status"></span>
          <span id="bandwidth-value"></span>
          <div id="bandwidth-bar"></div>
          <span id="cpu-value"></span>
          <div id="cpu-bar"></div>
          <span id="happiness-value"></span>
          <div id="happiness-bar"></div>
          <div id="user-logs"></div>
          <div id="analyzer-logs"></div>
          <span id="stat-active-packets"></span>
          <span id="stat-bandwidth"></span>
          <span id="device-count-value"></span>
          <span id="attack-bandwidth-value"></span>
          <div id="botnet-ranges"></div>
          <div id="ip-blacklist"></div>
          <span id="rate-limit-value"></span>
          <div id="legend"></div>
        </body>
      </html>
    `);
    
    global.document = dom.window.document;
    document = dom.window.document;
    uiManager = new UIManager();
  });

  it('should update server status badge with correct classes', () => {
    uiManager.updateServerStatus(SERVER_STATUS.ONLINE);
    const badge = document.getElementById('server-status');
    expect(badge.textContent).toBe('ONLINE');
    expect(badge.className).toContain('bg-emerald-900');

    uiManager.updateServerStatus(SERVER_STATUS.DEGRADED);
    expect(badge.textContent).toBe('DEGRADED');
    expect(badge.className).toContain('bg-amber-900');

    uiManager.updateServerStatus(SERVER_STATUS.CRASHED);
    expect(badge.textContent).toBe('CRASHED');
    expect(badge.className).toContain('bg-red-900');
  });

  it('should update bandwidth bar width and value', () => {
    uiManager.updateResourceBars(75, 30);
    
    const bandwidthValue = document.getElementById('bandwidth-value');
    const bandwidthBar = document.getElementById('bandwidth-bar');
    
    expect(bandwidthValue.textContent).toBe('75%');
    expect(bandwidthBar.style.width).toBe('75%');
  });

  it('should update CPU bar width and value', () => {
    uiManager.updateResourceBars(30, 85);
    
    const cpuValue = document.getElementById('cpu-value');
    const cpuBar = document.getElementById('cpu-bar');
    
    expect(cpuValue.textContent).toBe('85%');
    expect(cpuBar.style.width).toBe('85%');
  });

  it('should color-code resource bars based on usage', () => {
    const bandwidthBar = document.getElementById('bandwidth-bar');
    
    // Low usage - green
    uiManager.updateResourceBars(50, 50);
    expect(bandwidthBar.className).toContain('bg-emerald-500');
    
    // Medium usage - amber
    uiManager.updateResourceBars(75, 50);
    expect(bandwidthBar.className).toContain('bg-amber-500');
    
    // High usage - red
    uiManager.updateResourceBars(95, 50);
    expect(bandwidthBar.className).toContain('bg-red-500');
  });

  it('should update happiness with color coding', () => {
    const happinessValue = document.getElementById('happiness-value');
    const happinessBar = document.getElementById('happiness-bar');
    
    // High happiness - green
    uiManager.updateHappiness(90);
    expect(happinessValue.textContent).toBe('90%');
    expect(happinessBar.style.width).toBe('90%');
    expect(happinessValue.className).toContain('text-emerald-400');
    
    // Medium happiness - amber
    uiManager.updateHappiness(60);
    expect(happinessValue.className).toContain('text-amber-400');
    
    // Low happiness - red
    uiManager.updateHappiness(30);
    expect(happinessValue.className).toContain('text-red-400');
  });

  it('should add and cap user logs at 50 entries', () => {
    // Add more than 50 logs
    for (let i = 0; i < 60; i++) {
      uiManager.addUserLog(`Log ${i}`);
    }
    
    expect(uiManager.userLogBuffer.length).toBe(50);
    expect(uiManager.userLogBuffer[0]).toBe('Log 59'); // Most recent
  });

  it('should render user logs in DOM', () => {
    uiManager.addUserLog('Test log 1');
    uiManager.addUserLog('Test log 2');
    
    const userLogs = document.getElementById('user-logs');
    expect(userLogs.textContent).toContain('Test log 2'); // Most recent first
  });

  it('should update analyzer logs with color coding', () => {
    const logs = [
      { ip: '1.2.3.4', type: 'UDP', action: 'BLOCKED', reason: 'BLOCK_PROTOCOL' },
      { ip: '5.6.7.8', type: 'HTTP_GET', action: 'ALLOWED', reason: 'OK' }
    ];
    
    uiManager.updateAnalyzerLogs(logs);
    
    const analyzerLogs = document.getElementById('analyzer-logs');
    expect(analyzerLogs.textContent).toContain('BLOCKED');
    expect(analyzerLogs.textContent).toContain('ALLOWED');
    expect(analyzerLogs.innerHTML).toContain('text-red-400'); // Blocked is red
    expect(analyzerLogs.innerHTML).toContain('text-emerald-400'); // Allowed is green
  });

  it('should show placeholder when no logs exist', () => {
    uiManager.updateAnalyzerLogs([]);
    
    const analyzerLogs = document.getElementById('analyzer-logs');
    expect(analyzerLogs.textContent).toContain('No traffic');
  });

  it('should update network stats', () => {
    uiManager.updateNetworkStats(42, 65);
    
    const activePackets = document.getElementById('stat-active-packets');
    const bandwidth = document.getElementById('stat-bandwidth');
    
    expect(activePackets.textContent).toBe('42');
    expect(bandwidth.textContent).toBe('65%');
  });

  it('should update attacker info', () => {
    uiManager.updateAttackerInfo(100, 1.5);
    
    const deviceCount = document.getElementById('device-count-value');
    const attackBandwidth = document.getElementById('attack-bandwidth-value');
    
    expect(deviceCount.textContent).toBe('100');
    expect(attackBandwidth.textContent).toBe('1.5x');
  });

  it('should update botnet ranges', () => {
    uiManager.updateBotnetRanges(['10.1.2', '192.168.1']);
    
    const botnetRanges = document.getElementById('botnet-ranges');
    expect(botnetRanges.textContent).toContain('10.1.2.0/24');
    expect(botnetRanges.textContent).toContain('192.168.1.0/24');
  });

  it('should show placeholder when no botnet ranges', () => {
    uiManager.updateBotnetRanges([]);
    
    const botnetRanges = document.getElementById('botnet-ranges');
    expect(botnetRanges.textContent).toContain('Not attacking');
  });

  it('should render legend with shapes and colors', () => {
    const legendData = [
      { shape: 'circle', color: '#22C55E', label: 'Legitimate' },
      { shape: 'square', color: '#EF4444', label: 'UDP' }
    ];
    
    uiManager.renderLegend(legendData);
    
    const legend = document.getElementById('legend');
    expect(legend.textContent).toContain('Legitimate');
    expect(legend.textContent).toContain('UDP');
  });

  it('should clear all logs', () => {
    uiManager.addUserLog('Test log');
    uiManager.clearLogs();
    
    expect(uiManager.userLogBuffer.length).toBe(0);
    
    const userLogs = document.getElementById('user-logs');
    expect(userLogs.textContent).toContain('No activity');
  });

  it('should update complete state', () => {
    const state = {
      server: {
        status: SERVER_STATUS.ONLINE,
        bandwidthUsage: 45,
        cpuLoad: 30,
        happinessScore: 85
      },
      analyzerLogs: [],
      particles: [{ x: 0, y: 0 }]
    };
    
    uiManager.update(state);
    
    const status = document.getElementById('server-status');
    expect(status.textContent).toBe('ONLINE');
  });
});
