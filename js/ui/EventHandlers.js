import { ATTACK_TYPES, PROTOCOLS } from '../constants.js';

export default class EventHandlers {
  constructor(orchestrator, uiManager, renderer) {
    this.orchestrator = orchestrator;
    this.uiManager = uiManager;
    this.renderer = renderer;
    
    this.elements = {
      // Simulation controls
      btnStartSimulation: document.getElementById('btn-start-simulation'),
      btnStopSimulation: document.getElementById('btn-stop-simulation'),
      btnStartAttack: document.getElementById('btn-start-attack'),
      btnStopAttack: document.getElementById('btn-stop-attack'),
      btnReset: document.getElementById('btn-reset'),
      
      // Attacker controls
      sliderDeviceCount: document.getElementById('slider-device-count'),
      dropdownAttackType: document.getElementById('dropdown-attack-type'),
      inputTargetIP: document.getElementById('input-target-ip'),
      sliderAttackBandwidth: document.getElementById('slider-attack-bandwidth'),
      
      // Server controls
      sliderServerCapacity: document.getElementById('slider-server-capacity'),
      
      // Firewall controls
      btnToggleFirewall: document.getElementById('btn-toggle-firewall'),
      firewallDashboard: document.getElementById('firewall-dashboard'),
      firewallToggleIcon: document.getElementById('firewall-toggle-icon'),
      checkBlockTcp: document.getElementById('check-block-tcp'),
      checkBlockUdp: document.getElementById('check-block-udp'),
      checkBlockIcmp: document.getElementById('check-block-icmp'),
      checkRateLimit: document.getElementById('check-rate-limit'),
      sliderRateLimit: document.getElementById('slider-rate-limit'),
      rateLimitControls: document.getElementById('rate-limit-controls'),
      dropdownRateLimitScope: document.getElementById('dropdown-rate-limit-scope'),
      checkLoadBalancing: document.getElementById('check-load-balancing')
    };
  }

  attachAll() {
    this.attachSimulationControls();
    this.attachAttackerControls();
    this.attachServerControls();
    this.attachFirewallControls();
  }

  attachSimulationControls() {
    if (this.elements.btnStartSimulation) {
      this.elements.btnStartSimulation.addEventListener('click', () => {
        this.orchestrator.isSimulationRunning = true;
        this.toggleSimulationButtons(true);
        this.elements.btnStartAttack.disabled = false;
      });
    }

    if (this.elements.btnStopSimulation) {
      this.elements.btnStopSimulation.addEventListener('click', () => {
        this.orchestrator.isSimulationRunning = false;
        this.toggleSimulationButtons(false);
        this.elements.btnStartAttack.disabled = true;
      });
    }

    if (this.elements.btnStartAttack) {
      this.elements.btnStartAttack.addEventListener('click', () => {
        // Regenerate botnet ranges on attack start
        this.orchestrator.attacker.generateBotnetRanges();
        this.orchestrator.attacker.isAttacking = true;
        this.toggleAttackButtons(true);
        this.uiManager.updateBotnetRanges(this.orchestrator.attacker.botnetRanges);
      });
    }

    if (this.elements.btnStopAttack) {
      this.elements.btnStopAttack.addEventListener('click', () => {
        this.orchestrator.attacker.isAttacking = false;
        this.toggleAttackButtons(false);
      });
    }

    if (this.elements.btnReset) {
      this.elements.btnReset.addEventListener('click', () => {
        this.orchestrator.reset();
        this.uiManager.clearLogs();
        this.uiManager.updateBotnetRanges([]);
        this.toggleSimulationButtons(false);
        this.toggleAttackButtons(false);
        this.elements.btnStartAttack.disabled = true;
        
        // Reset UI controls to defaults
        if (this.elements.sliderDeviceCount) this.elements.sliderDeviceCount.value = 1;
        if (this.elements.sliderAttackBandwidth) this.elements.sliderAttackBandwidth.value = 1;
        if (this.elements.dropdownAttackType) this.elements.dropdownAttackType.value = 'UDP';
        if (this.elements.inputTargetIP) this.elements.inputTargetIP.value = '203.0.113.10';
        if (this.elements.dropdownRateLimitScope) this.elements.dropdownRateLimitScope.value = 'ALL';
        if (this.elements.sliderServerCapacity) {
          this.elements.sliderServerCapacity.value = 1;
          const label = document.getElementById('server-capacity-value');
          if (label) label.textContent = '1.0x';
        }
        this.uiManager.updateAttackerInfo(1, 1);
      });
    }
  }

  attachAttackerControls() {
    if (this.elements.sliderDeviceCount) {
      this.elements.sliderDeviceCount.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        this.orchestrator.attacker.deviceCount = value;
        this.uiManager.updateAttackerInfo(value, this.orchestrator.attacker.bandwidthMultiplier);
      });
    }

    if (this.elements.dropdownAttackType) {
      this.elements.dropdownAttackType.addEventListener('change', (e) => {
        const selectedKey = e.target.value;
        const selectedAttackType = ATTACK_TYPES[selectedKey];
        
        if (!selectedAttackType) {
          // Fallback to UDP if invalid value
          console.warn(`Invalid attack type selected: "${selectedKey}". Falling back to UDP.`);
          this.orchestrator.attacker.attackType = ATTACK_TYPES.UDP;
          e.target.value = 'UDP';
          return;
        }
        
        this.orchestrator.attacker.attackType = selectedAttackType;
      });
    }

    if (this.elements.inputTargetIP) {
      this.elements.inputTargetIP.addEventListener('input', (e) => {
        this.orchestrator.attacker.targetIP = e.target.value;
      });
    }

    if (this.elements.sliderAttackBandwidth) {
      this.elements.sliderAttackBandwidth.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.orchestrator.attacker.bandwidthMultiplier = value;
        this.uiManager.updateAttackerInfo(this.orchestrator.attacker.deviceCount, value);
      });
    }
  }

  attachServerControls() {
    if (this.elements.sliderServerCapacity) {
      this.elements.sliderServerCapacity.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        this.orchestrator.server.bandwidthCapacityMultiplier = value;
        // Update the UI label
        const label = document.getElementById('server-capacity-value');
        if (label) {
          label.textContent = value.toFixed(1) + 'x';
        }
      });
    }
  }

  attachFirewallControls() {
    // Firewall dashboard toggle
    if (this.elements.btnToggleFirewall) {
      this.elements.btnToggleFirewall.addEventListener('click', () => {
        const isHidden = this.elements.firewallDashboard.classList.contains('hidden');
        if (isHidden) {
          this.elements.firewallDashboard.classList.remove('hidden');
          this.elements.firewallToggleIcon.textContent = '▲';
          this.orchestrator.firewall.dashboardOpen = true;
        } else {
          this.elements.firewallDashboard.classList.add('hidden');
          this.elements.firewallToggleIcon.textContent = '▼';
          this.orchestrator.firewall.dashboardOpen = false;
        }
      });
    }

    // Protocol blocking
    if (this.elements.checkBlockTcp) {
      this.elements.checkBlockTcp.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.orchestrator.firewall.blockedProtocols.add(PROTOCOLS.TCP);
        } else {
          this.orchestrator.firewall.blockedProtocols.delete(PROTOCOLS.TCP);
        }
      });
    }

    if (this.elements.checkBlockUdp) {
      this.elements.checkBlockUdp.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.orchestrator.firewall.blockedProtocols.add(PROTOCOLS.UDP);
        } else {
          this.orchestrator.firewall.blockedProtocols.delete(PROTOCOLS.UDP);
        }
      });
    }

    if (this.elements.checkBlockIcmp) {
      this.elements.checkBlockIcmp.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.orchestrator.firewall.blockedProtocols.add(PROTOCOLS.ICMP);
        } else {
          this.orchestrator.firewall.blockedProtocols.delete(PROTOCOLS.ICMP);
        }
      });
    }

    // Rate limiting
    if (this.elements.checkRateLimit) {
      this.elements.checkRateLimit.addEventListener('change', (e) => {
        this.orchestrator.firewall.rateLimitEnabled = e.target.checked;
        if (this.elements.rateLimitControls) {
          if (e.target.checked) {
            this.elements.rateLimitControls.classList.remove('hidden');
          } else {
            this.elements.rateLimitControls.classList.add('hidden');
          }
        }
      });
    }

    if (this.elements.sliderRateLimit) {
      this.elements.sliderRateLimit.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        this.orchestrator.firewall.rateLimitThreshold = value;
        if (this.uiManager.elements.rateLimitValue) {
          this.uiManager.elements.rateLimitValue.textContent = value;
        }
      });
    }

    if (this.elements.dropdownRateLimitScope) {
      this.elements.dropdownRateLimitScope.addEventListener('change', (e) => {
        this.orchestrator.firewall.rateLimitScope = e.target.value;
      });
    }

    // Load balancing
    if (this.elements.checkLoadBalancing) {
      this.elements.checkLoadBalancing.addEventListener('change', (e) => {
        this.orchestrator.firewall.loadBalancingEnabled = e.target.checked;
      });
    }
  }

  toggleSimulationButtons(isRunning) {
    if (this.elements.btnStartSimulation) {
      if (isRunning) {
        this.elements.btnStartSimulation.classList.add('hidden');
      } else {
        this.elements.btnStartSimulation.classList.remove('hidden');
      }
    }
    if (this.elements.btnStopSimulation) {
      if (isRunning) {
        this.elements.btnStopSimulation.classList.remove('hidden');
      } else {
        this.elements.btnStopSimulation.classList.add('hidden');
      }
    }
  }

  toggleAttackButtons(isAttacking) {
    if (this.elements.btnStartAttack) {
      if (isAttacking) {
        this.elements.btnStartAttack.classList.add('hidden');
      } else {
        this.elements.btnStartAttack.classList.remove('hidden');
      }
    }
    if (this.elements.btnStopAttack) {
      if (isAttacking) {
        this.elements.btnStopAttack.classList.remove('hidden');
      } else {
        this.elements.btnStopAttack.classList.add('hidden');
      }
    }
  }

  // Called periodically to update IP blacklist UI
  updateIPBlacklist() {
    const detectedSubnets = this.orchestrator.firewall.getDetectedSubnets();
    this.uiManager.updateDetectedSubnets(
      detectedSubnets,
      this.orchestrator.firewall.blockedIPs,
      (subnet, isBlocked) => {
        if (isBlocked) {
          this.orchestrator.firewall.blockedIPs.add(subnet);
        } else {
          this.orchestrator.firewall.blockedIPs.delete(subnet);
        }
      }
    );
  }
}
