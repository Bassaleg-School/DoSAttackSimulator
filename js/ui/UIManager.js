import { SERVER_STATUS, CONSTANTS } from '../constants.js';

export default class UIManager {
  constructor() {
    this.elements = {
      // Server stats
      serverStatus: document.getElementById('server-status'),
      serverOriginIP: document.getElementById('server-origin-ip'),
      serverPublicIPRow: document.getElementById('server-public-ip-row'),
      serverPublicIP: document.getElementById('server-public-ip'),
      bandwidthValue: document.getElementById('bandwidth-value'),
      bandwidthBar: document.getElementById('bandwidth-bar'),
      cpuValue: document.getElementById('cpu-value'),
      cpuBar: document.getElementById('cpu-bar'),
      happinessValue: document.getElementById('happiness-value'),
      happinessBar: document.getElementById('happiness-bar'),
      
      // Server IP Info (v1.2)
      displayPublicIP: document.getElementById('display-public-ip'),
      displayOriginIP: document.getElementById('display-origin-ip'),
      
      // Logs
      userLogs: document.getElementById('user-logs'),
      analyzerLogs: document.getElementById('analyzer-logs'),
      
      // Network stats
      statActivePackets: document.getElementById('stat-active-packets'),
      statBandwidth: document.getElementById('stat-bandwidth'),
      
      // Attacker info
      deviceCountValue: document.getElementById('device-count-value'),
      attackBandwidthValue: document.getElementById('attack-bandwidth-value'),
      attackerIcon: document.getElementById('attacker-icon'),
      botnetRanges: document.getElementById('botnet-ranges'),
      
      // Firewall
      ipBlacklist: document.getElementById('ip-blacklist'),
      rateLimitValue: document.getElementById('rate-limit-value'),
      
      // Legend
      legend: document.getElementById('legend')
    };
    
    this.userLogBuffer = [];
  }

  updateServerStatus(status) {
    const badge = this.elements.serverStatus;
    if (!badge) return;

    badge.textContent = status;
    
    // Update badge styling based on status
    badge.className = 'inline-block px-3 py-1 rounded-full text-xs font-semibold';
    
    switch (status) {
      case SERVER_STATUS.ONLINE:
        badge.classList.add('bg-emerald-900', 'text-emerald-300');
        break;
      case SERVER_STATUS.DEGRADED:
        badge.classList.add('bg-amber-900', 'text-amber-300');
        break;
      case SERVER_STATUS.CRASHED:
        badge.classList.add('bg-red-900', 'text-red-300');
        break;
    }
  }

  updateServerIPs(publicIP, originIP) {
    if (this.elements.displayPublicIP) {
      this.elements.displayPublicIP.textContent = publicIP;
      this.elements.displayPublicIP.className = publicIP === CONSTANTS.PROXY_PUBLIC_IP 
        ? 'text-cyan-400 font-mono' // Highlight proxy IP
        : 'text-emerald-400 font-mono';
    }
    if (this.elements.displayOriginIP) {
      this.elements.displayOriginIP.textContent = originIP;
    }
  }

  updateAddressing(isProxyEnabled) {
    if (!this.elements.serverPublicIPRow) return;
    
    if (isProxyEnabled) {
      this.elements.serverPublicIPRow.classList.remove('hidden');
    } else {
      this.elements.serverPublicIPRow.classList.add('hidden');
    }
  }

  updateResourceBars(bandwidthUsage, cpuLoad) {
    if (this.elements.bandwidthValue) {
      this.elements.bandwidthValue.textContent = `${Math.round(bandwidthUsage)}%`;
    }
    if (this.elements.bandwidthBar) {
      this.elements.bandwidthBar.style.width = `${bandwidthUsage}%`;
      // Update color based on usage
      if (bandwidthUsage >= 90) {
        this.elements.bandwidthBar.className = 'h-full bg-red-500 transition-all duration-150';
      } else if (bandwidthUsage >= 70) {
        this.elements.bandwidthBar.className = 'h-full bg-amber-500 transition-all duration-150';
      } else {
        this.elements.bandwidthBar.className = 'h-full bg-emerald-500 transition-all duration-150';
      }
    }

    if (this.elements.cpuValue) {
      this.elements.cpuValue.textContent = `${Math.round(cpuLoad)}%`;
    }
    if (this.elements.cpuBar) {
      this.elements.cpuBar.style.width = `${cpuLoad}%`;
      // Update color based on usage
      if (cpuLoad >= 90) {
        this.elements.cpuBar.className = 'h-full bg-red-500 transition-all duration-150';
      } else if (cpuLoad >= 70) {
        this.elements.cpuBar.className = 'h-full bg-amber-500 transition-all duration-150';
      } else {
        this.elements.cpuBar.className = 'h-full bg-emerald-500 transition-all duration-150';
      }
    }
  }

  updateHappiness(happiness) {
    if (this.elements.happinessValue) {
      this.elements.happinessValue.textContent = `${Math.round(happiness)}%`;
    }
    if (this.elements.happinessBar) {
      this.elements.happinessBar.style.width = `${happiness}%`;
      // Color code happiness
      if (happiness >= 80) {
        this.elements.happinessBar.className = 'h-full bg-emerald-500 transition-all duration-150';
        this.elements.happinessValue.className = 'text-emerald-400 font-mono';
      } else if (happiness >= 50) {
        this.elements.happinessBar.className = 'h-full bg-amber-500 transition-all duration-150';
        this.elements.happinessValue.className = 'text-amber-400 font-mono';
      } else {
        this.elements.happinessBar.className = 'h-full bg-red-500 transition-all duration-150';
        this.elements.happinessValue.className = 'text-red-400 font-mono';
      }
    }
  }

  addUserLog(message) {
    if (!this.elements.userLogs) return;
    
    this.userLogBuffer.unshift(message);
    
    // Keep only last 50 entries
    if (this.userLogBuffer.length > CONSTANTS.UI_LOG_MAX_ENTRIES) {
      this.userLogBuffer = this.userLogBuffer.slice(0, CONSTANTS.UI_LOG_MAX_ENTRIES);
    }
    
    this.renderUserLogs();
  }

  renderUserLogs() {
    if (!this.elements.userLogs) return;
    
    if (this.userLogBuffer.length === 0) {
      this.elements.userLogs.innerHTML = '<p class="text-slate-500">No activity</p>';
      return;
    }
    
    this.elements.userLogs.innerHTML = this.userLogBuffer
      .slice(0, 10) // Show only last 10 in UI
      .map(log => `<div>${log}</div>`)
      .join('');
  }

  updateAnalyzerLogs(logs) {
    if (!this.elements.analyzerLogs) return;
    
    if (logs.length === 0) {
      this.elements.analyzerLogs.innerHTML = '<p class="text-slate-500">No traffic</p>';
      return;
    }
    
    // Clear and rebuild with proper DOM manipulation to avoid injection
    this.elements.analyzerLogs.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    // Show last 20 logs
    logs.slice(0, 20).forEach(log => {
      const div = document.createElement('div');
      const colorClass = log.action === 'BLOCKED' || log.action === 'DROPPED' ? 'text-red-400' : 'text-emerald-400';
      div.className = colorClass;
      div.textContent = `${log.ip} ${log.type} ${log.action}`;
      fragment.appendChild(div);
    });
    
    this.elements.analyzerLogs.appendChild(fragment);
  }

  updateNetworkStats(activePackets, bandwidth) {
    if (this.elements.statActivePackets) {
      this.elements.statActivePackets.textContent = activePackets;
    }
    if (this.elements.statBandwidth) {
      this.elements.statBandwidth.textContent = `${Math.round(bandwidth)}%`;
    }
  }

  updateAttackerInfo(deviceCount, attackBandwidth) {
    if (this.elements.deviceCountValue) {
      this.elements.deviceCountValue.textContent = deviceCount;
    }
    if (this.elements.attackBandwidthValue) {
      this.elements.attackBandwidthValue.textContent = `${attackBandwidth.toFixed(1)}x`;
    }
    
    // Update attacker icon based on device count
    if (this.elements.attackerIcon) {
      let icon;
      if (deviceCount === 1) {
        icon = '👤'; // Single person (DoS)
      } else if (deviceCount < 10) {
        icon = '👥'; // Two people
      } else if (deviceCount < 50) {
        icon = '👨‍👩‍👧‍👦'; // Small group
      } else if (deviceCount < 200) {
        icon = '🏘️'; // Houses (botnet)
      } else {
        icon = '🌐'; // Global network (large-scale DDoS)
      }
      this.elements.attackerIcon.textContent = icon;
    }
  }

  updateBotnetRanges(ranges) {
    if (!this.elements.botnetRanges) return;
    
    if (ranges.length === 0) {
      this.elements.botnetRanges.innerHTML = '<p class="text-slate-500">Not attacking</p>';
      return;
    }
    
    this.elements.botnetRanges.innerHTML = ranges
      .map(range => `<div>${range}.0/24</div>`)
      .join('');
  }

  updateDetectedSubnets(subnets, blockedIPs, onToggleBlock) {
    if (!this.elements.ipBlacklist) return;
    
    if (subnets.length === 0) {
      this.elements.ipBlacklist.innerHTML = '<p class="text-slate-500">No traffic detected</p>';
      return;
    }
    
    // Clear and rebuild with proper DOM manipulation to avoid injection
    this.elements.ipBlacklist.innerHTML = '';
    const fragment = document.createDocumentFragment();
    
    subnets.forEach(subnet => {
      const isBlocked = blockedIPs.has(subnet);
      const checkboxId = `check-ip-${subnet.replaceAll('.', '-')}`;
      
      const label = document.createElement('label');
      label.className = 'flex items-center';
      
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = checkboxId;
      input.className = 'mr-2 subnet-checkbox';
      input.dataset.subnet = subnet;
      if (isBlocked) {
        input.checked = true;
      }
      
      const span = document.createElement('span');
      span.textContent = `${subnet}.0/24`;
      
      label.appendChild(input);
      label.appendChild(span);
      fragment.appendChild(label);
    });
    
    this.elements.ipBlacklist.appendChild(fragment);
    
    // Attach event listeners
    if (onToggleBlock) {
      const checkboxes = this.elements.ipBlacklist.querySelectorAll('.subnet-checkbox');
      checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          onToggleBlock(e.target.dataset.subnet, e.target.checked);
        });
      });
    }
  }

  renderLegend(legendData) {
    if (!this.elements.legend) return;
    
    this.elements.legend.innerHTML = legendData
      .map(item => {
        let shapeHTML = '';
        switch (item.shape) {
          case 'circle':
            shapeHTML = `<div class="w-3 h-3 rounded-full" style="background-color: ${item.color}"></div>`;
            break;
          case 'square':
            shapeHTML = `<div class="w-3 h-3" style="background-color: ${item.color}"></div>`;
            break;
          case 'triangle':
            shapeHTML = `<div class="w-3 h-3 relative">
              <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 10px solid ${item.color};"></div>
            </div>`;
            break;
          case 'lock':
            shapeHTML = `<div class="w-3 h-3 text-xs" style="color: ${item.color}">🔒</div>`;
            break;
        }
        return `
          <div class="flex items-center gap-2">
            ${shapeHTML}
            <span class="text-slate-300">${item.label}</span>
          </div>
        `;
      })
      .join('');
  }

  clearLogs() {
    this.userLogBuffer = [];
    this.renderUserLogs();
    if (this.elements.analyzerLogs) {
      this.elements.analyzerLogs.innerHTML = '<p class="text-slate-500">No traffic</p>';
    }
  }

  update(state) {
    this.updateServerStatus(state.server.status);
    this.updateResourceBars(state.server.bandwidthUsage, state.server.cpuLoad);
    this.updateHappiness(state.server.happinessScore);
    this.updateAnalyzerLogs(state.analyzerLogs);
    this.updateNetworkStats(state.particles.length, state.server.bandwidthUsage);
  }
}
