import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import EventHandlers from '../../js/ui/EventHandlers.js';
import Orchestrator from '../../js/core/Orchestrator.js';
import UIManager from '../../js/ui/UIManager.js';
import { ATTACK_TYPES, PROTOCOLS } from '../../js/constants.js';

describe('EventHandlers', () => {
  let dom;
  let orchestrator;
  let uiManager;
  let eventHandlers;

  beforeEach(() => {
    // Create comprehensive DOM structure
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <button id="btn-start-simulation"></button>
          <button id="btn-stop-simulation" class="hidden"></button>
          <button id="btn-start-attack" disabled></button>
          <button id="btn-stop-attack" class="hidden"></button>
          <button id="btn-reset"></button>
          <input type="range" id="slider-device-count" value="1" />
          <select id="dropdown-attack-type">
            <option value="UDP">UDP</option>
            <option value="TCP_SYN">TCP SYN</option>
            <option value="ICMP">ICMP</option>
          </select>
          <input type="range" id="slider-attack-bandwidth" value="1.0" />
          <button id="btn-toggle-firewall"></button>
          <div id="firewall-dashboard" class="hidden"></div>
          <span id="firewall-toggle-icon">▼</span>
          <input type="checkbox" id="check-block-tcp" />
          <input type="checkbox" id="check-block-udp" />
          <input type="checkbox" id="check-block-icmp" />
          <input type="checkbox" id="check-rate-limit" />
          <input type="range" id="slider-rate-limit" value="20" />
          <div id="rate-limit-controls" class="hidden"></div>
          <select id="select-proxy-badge">
            <option value="ip">IP</option>
            <option value="count">Count</option>
          </select>
          <input type="checkbox" id="check-load-balancing" />
          <span id="device-count-value"></span>
          <span id="attack-bandwidth-value"></span>
          <span id="rate-limit-value"></span>
          <div id="botnet-ranges"></div>
          <div id="user-logs"></div>
          <div id="analyzer-logs"></div>
        </body>
      </html>
    `);
    
    globalThis.document = dom.window.document;
    
    orchestrator = new Orchestrator();
    uiManager = new UIManager();
    uiManager.updateAttackerInfo = vi.fn();
    uiManager.updateBotnetRanges = vi.fn();
    uiManager.clearLogs = vi.fn();
    
    eventHandlers = new EventHandlers(orchestrator, uiManager, null);
  });

  it('should start simulation when start button clicked', () => {
    eventHandlers.attachSimulationControls();
    
    const btn = dom.window.document.getElementById('btn-start-simulation');
    btn.click();
    
    expect(orchestrator.isSimulationRunning).toBe(true);
    expect(dom.window.document.getElementById('btn-start-attack').disabled).toBe(false);
  });

  it('should stop simulation when stop button clicked', () => {
    eventHandlers.attachSimulationControls();
    
    orchestrator.isSimulationRunning = true;
    const btn = dom.window.document.getElementById('btn-stop-simulation');
    btn.click();
    
    expect(orchestrator.isSimulationRunning).toBe(false);
  });

  it('should start attack and regenerate botnet ranges', () => {
    eventHandlers.attachSimulationControls();
    
    orchestrator.attacker.deviceCount = 50;
    const btn = dom.window.document.getElementById('btn-start-attack');
    btn.disabled = false; // Enable button first
    btn.click();
    
    expect(orchestrator.attacker.isAttacking).toBe(true);
    expect(orchestrator.attacker.botnetRanges.length).toBeGreaterThan(0);
    expect(uiManager.updateBotnetRanges).toHaveBeenCalled();
  });

  it('should stop attack when stop button clicked', () => {
    eventHandlers.attachSimulationControls();
    
    orchestrator.attacker.isAttacking = true;
    const btn = dom.window.document.getElementById('btn-stop-attack');
    btn.click();
    
    expect(orchestrator.attacker.isAttacking).toBe(false);
  });

  it('should reset simulation and clear state', () => {
    eventHandlers.attachSimulationControls();
    
    orchestrator.isSimulationRunning = true;
    orchestrator.attacker.isAttacking = true;
    orchestrator.particles.push({ x: 0, y: 0 });
    
    const btn = dom.window.document.getElementById('btn-reset');
    btn.click();
    
    expect(orchestrator.particles.length).toBe(0);
    expect(uiManager.clearLogs).toHaveBeenCalled();
    expect(uiManager.updateBotnetRanges).toHaveBeenCalledWith([]);
  });

  it('should update device count when slider changes', () => {
    eventHandlers.attachAttackerControls();
    
    const slider = dom.window.document.getElementById('slider-device-count');
    slider.value = '100';
    slider.dispatchEvent(new dom.window.Event('input'));
    
    expect(orchestrator.attacker.deviceCount).toBe(100);
    expect(uiManager.updateAttackerInfo).toHaveBeenCalled();
  });

  it('should update attack type when dropdown changes', () => {
    eventHandlers.attachAttackerControls();
    
    const dropdown = dom.window.document.getElementById('dropdown-attack-type');
    dropdown.value = 'TCP_SYN';
    dropdown.dispatchEvent(new dom.window.Event('change'));
    
    expect(orchestrator.attacker.attackType).toBe(ATTACK_TYPES.TCP_SYN);
  });

  it('should update attack bandwidth when slider changes', () => {
    eventHandlers.attachAttackerControls();
    
    const slider = dom.window.document.getElementById('slider-attack-bandwidth');
    slider.value = '1.5';
    slider.dispatchEvent(new dom.window.Event('input'));
    
    expect(orchestrator.attacker.bandwidthMultiplier).toBe(1.5);
    expect(uiManager.updateAttackerInfo).toHaveBeenCalled();
  });

  it('should block TCP protocol when checkbox checked', () => {
    eventHandlers.attachFirewallControls();
    
    const checkbox = dom.window.document.getElementById('check-block-tcp');
    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.window.Event('change'));
    
    expect(orchestrator.firewall.blockedProtocols.has(PROTOCOLS.TCP)).toBe(true);
    
    // Uncheck
    checkbox.checked = false;
    checkbox.dispatchEvent(new dom.window.Event('change'));
    expect(orchestrator.firewall.blockedProtocols.has(PROTOCOLS.TCP)).toBe(false);
  });

  it('should block UDP protocol when checkbox checked', () => {
    eventHandlers.attachFirewallControls();
    
    const checkbox = dom.window.document.getElementById('check-block-udp');
    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.window.Event('change'));
    
    expect(orchestrator.firewall.blockedProtocols.has(PROTOCOLS.UDP)).toBe(true);
  });

  it('should block ICMP protocol when checkbox checked', () => {
    eventHandlers.attachFirewallControls();
    
    const checkbox = dom.window.document.getElementById('check-block-icmp');
    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.window.Event('change'));
    
    expect(orchestrator.firewall.blockedProtocols.has(PROTOCOLS.ICMP)).toBe(true);
  });

  it('should enable rate limiting and show controls', () => {
    eventHandlers.attachFirewallControls();
    
    const checkbox = dom.window.document.getElementById('check-rate-limit');
    const controls = dom.window.document.getElementById('rate-limit-controls');
    
    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.window.Event('change'));
    
    expect(orchestrator.firewall.rateLimitEnabled).toBe(true);
    expect(controls.classList.contains('hidden')).toBe(false);
  });

  it('should update rate limit threshold when slider changes', () => {
    eventHandlers.attachFirewallControls();
    
    const slider = dom.window.document.getElementById('slider-rate-limit');
    slider.value = '30';
    slider.dispatchEvent(new dom.window.Event('input'));
    
    expect(orchestrator.firewall.rateLimitThreshold).toBe(30);
  });

  it('should enable load balancing when checkbox checked', () => {
    eventHandlers.attachFirewallControls();
    
    const checkbox = dom.window.document.getElementById('check-load-balancing');
    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.window.Event('change'));
    
    expect(orchestrator.firewall.loadBalancingEnabled).toBe(true);
  });

  it('should toggle simulation button visibility', () => {
    const btnStart = dom.window.document.getElementById('btn-start-simulation');
    const btnStop = dom.window.document.getElementById('btn-stop-simulation');
    
    eventHandlers.toggleSimulationButtons(true);
    expect(btnStart.classList.contains('hidden')).toBe(true);
    expect(btnStop.classList.contains('hidden')).toBe(false);
    
    eventHandlers.toggleSimulationButtons(false);
    expect(btnStart.classList.contains('hidden')).toBe(false);
    expect(btnStop.classList.contains('hidden')).toBe(true);
  });

  it('should toggle attack button visibility', () => {
    const btnStart = dom.window.document.getElementById('btn-start-attack');
    const btnStop = dom.window.document.getElementById('btn-stop-attack');
    
    eventHandlers.toggleAttackButtons(true);
    expect(btnStart.classList.contains('hidden')).toBe(true);
    expect(btnStop.classList.contains('hidden')).toBe(false);
    
    eventHandlers.toggleAttackButtons(false);
    expect(btnStart.classList.contains('hidden')).toBe(false);
    expect(btnStop.classList.contains('hidden')).toBe(true);
  });

  it('should update proxy badge mode from display controls', () => {
    orchestrator.setProxyBadgeMode = vi.fn();
    eventHandlers.attachDisplayControls();

    const select = dom.window.document.getElementById('select-proxy-badge');
    select.value = 'count';
    select.dispatchEvent(new dom.window.Event('change'));

    expect(orchestrator.setProxyBadgeMode).toHaveBeenCalledWith('count');
  });
});
