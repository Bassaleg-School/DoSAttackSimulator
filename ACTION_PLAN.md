# Action Plan for DoS/DDoS Simulator (TDD with Vitest)

## Working Assumptions
- Frontend-only SPA, vanilla ES modules, Tailwind CLI for CSS (build-time only).
- Tests: Vitest (dom-less unit tests unless noted with DOM/canvas mocks).
- Code layout per SPEC: `index.html`, `js/**`, `src/input.css`, generated `css/main.css` committed.
- Dark theme using Tailwind palette (slate/emerald/amber/red). No extra runtime deps.

## Milestones
Each milestone is a commit boundary with green tests.

### 1) Tooling & Skeleton
Deliverables:
- `package.json` with scripts: `dev:css`, `build:css`, `test` (vitest), `lint` (optional).
- `tailwind.config.js` scanning `index.html`, `js/**`.
- `src/input.css` with Tailwind directives; generated `css/main.css` (committed).
- `index.html` scaffold: top control bar + three columns (empty placeholders ok).
- Vitest config (if needed) and sample passing test.
Tests (Vitest):
- Package scripts exist and run without error (smoke via spawn or import package.json).
- Tailwind config includes content paths and theme is dark mode friendly (config snapshot).
- Sample test passes (proves Vitest wiring).

### 2) Constants & Utilities
Deliverables:
- `js/constants.js` with all values from SPEC (ranges, colors, thresholds).
- `js/utils.js` helpers: `clamp`, random IP generator avoiding 172.16.0.x, subnet extractor (/24), rand choice.
Tests:
- Constants keys exist with correct types/ranges (table-driven expectations).
- `clamp` bounds correctly (below/within/above cases).
- IP generator never returns 172.16.0.*; returns string in IPv4 dotted form.
- Subnet extractor returns first three octets.

### 3) Models: Packet & GenuineTraffic
Deliverables:
- `Packet` class with properties: position, speed, type enum, isMalicious, sourceIP, payloadSize, optional `trafficWeight`.
- `GenuineTraffic` producing 50 HTTP_GET packets/sec from 172.16.0.1-50 evenly/randomly.
Tests:
- Packet defaults align to inputs; `isMalicious` false for HTTP_GET.
- Generated IPs stay in 172.16.0.1-50 inclusive.
- Rate math: 50 packets/sec total from 50 users.

### 4) Attacker Model
Deliverables:
- State: deviceCount, attackType (UDP, TCP_SYN, ICMP), targetIP, bandwidthMultiplier, isAttacking, botnetRanges.
- `generateBotnetRanges()` 1 /24 per 20 devices, avoids 172.16.0.*.
- `spawnPacket()` honoring attackType base rates; apply visual cap with `trafficWeight`.
- Desired PPS = deviceCount × baseRate × bandwidthMultiplier; visualPps = min(desiredPps, VISUAL_SPAWN_CAP_PER_SECOND).
Tests:
- Range count matches devices/20 (ceil).
- No botnet subnet equals 172.16.0.
- Desired vs visual Pps; `trafficWeight = desired/visual` when capped.
- AttackType selects correct base rate.

### 5) Server Model
Deliverables:
- State: bandwidthUsage, cpuLoad, activeConnections (with TTL), happinessScore, droppedPackets, status (ONLINE/DEGRADED/CRASHED).
- `receive(packet)`: volume attacks raise bandwidth; SYN adds connection, raises CPU; HTTP_GET succeeds unless load ≥99 (then timeout and drop legit).
- `update(dt)`: decay bandwidth (10%/s) and cpu (2%/s), expire SYN connections per TTL, recompute status thresholds (90/99 with recovery below 90), update happiness = 100 - dropped×2 clamped.
- Crash halts processing but auto-recovers when below recovery threshold.
Tests:
- Volume packet increases bandwidth; decays with dt.
- SYN adds connection, cpu rises; TTL expiry reduces counts/load.
- Status transitions: <90 online, 90-<99 degraded, ≥99 crashed, recover <90.
- HTTP_GET times out when crashed (drops increment happiness penalty).
- Happiness clamps 0-100.

### 6) Firewall Model
Deliverables:
- State: blockedProtocols, blockedIPs (/24 strings), rate limiting (threshold, per-IP counters, reset per second, protocol scope), loadBalancingEnabled flag, detected subnets tracking.
- `inspect(packet)` returns {allowed, reason}; applies protocol block, /24 blacklist, rate limit when enabled, respects protocol scope or ALL.
- Rate limiting only active when firewall dashboard is open/enabled (matches spec gating).
- `getDetectedSubnets()` aggregates seen /24s.
Tests:
- Blocking TCP rejects HTTP_GET and TCP_SYN.
- Blocking UDP/ICMP works individually.
- /24 blacklist blocks matching IP, allows others.
- Rate limit: counters reset each second; over-threshold blocks; protocol-scoped behavior verified; inactive when dashboard closed.
- Detected subnets list grows with traffic.

### 7) Simulation Orchestration & Game Loop
Deliverables:
- `core/GameLoop` with RAF-based tick, delta time.
- Main orchestrator tying packet spawning, firewall inspection, server receive, particle cap (`MAX_ACTIVE_PARTICLES`), crash short-circuit.
- Bandwidth collision drop rule when bandwidth >95% for legit packets.
- Traffic Analyzer log budget honored: prioritize blocked/dropped entries, sample allowed within `UI_ANALYZER_LOG_MAX_PER_SECOND`.
Tests:
- Loop calls update with computed dt (mock RAF).
- Spawn respects visual cap; particles list never exceeds max.
- Packets blocked by firewall never hit server.
- Crash stops processing; recovery resumes.
- Legit packet dropped when bandwidth over threshold increments dropped/happiness penalty.
- Analyzer logs capped per-second and prefer blocked/dropped events.

### 8) Canvas Renderer
Deliverables:
- Draw pipe(s), particles shapes/colors per type, legend; grey on firewall block, black on timeout; lock icons for half-open; pipe color based on load; dual pipes when load balancing.
- Respect canvas sizing from constants (`CANVAS_WIDTH`, `CANVAS_HEIGHT`, pipe dimensions) to match spec visuals.
Tests (logic/mocked canvas):
- Type→shape/color mapping table intact.
- Pipe color interpolation matches load values.
- Dual pipe rendering flag when loadBalancing enabled.
- Legend data includes all packet types + lock.
- Canvas uses configured dimensions and pipe sizing.

### 9) UI Structure & Styling
Deliverables:
- Flesh out `index.html` with top control bar, three panels; Tailwind classes per spec (padding, gaps, min widths, dark theme).
- `UIManager` to update bars (bandwidth, CPU), status badge, happiness color bands, logs capped at 50, analyzer log cap per second.
Tests (DOM with jsdom):
- Required sections exist; collapse/expand firewall container present.
- Status badge classes change with statuses.
- Health bar width reflects load value.
- Logs capped at 50 entries.

### 10) Event Handling & Controls
Deliverables:
- `EventHandlers` wiring: sliders for deviceCount/attack bandwidth/server bandwidth, dropdown for attack type, start/stop/reset/attack buttons, firewall protocol toggles, IP block toggles, rate limit toggle/slider, load balancing toggle, firewall collapse control.
- Start Attack generates botnet ranges (1 per 20 devices) and keeps them fixed until the next Start Attack; Stop Attack halts new malicious spawns but lets in-flight packets proceed.
- Reset clears state, particles, logs, regenerates botnet ranges on next attack start.
Tests:
- UI control changes propagate to models (spy/state assertions).
- Start/stop flip simulation/attack flags appropriately and refresh botnet ranges on attack start.
- Reset restores defaults and empties logs/particles.
- Firewall collapse toggles DOM class/state.

### 11) Mitigation Behaviors
Deliverables:
- Rate limiting drops over-threshold traffic; load balancing doubles effective bandwidth capacity in server load calc; blocking TCP immediately blocks legit traffic and happiness drops accordingly.
Tests:
- Rate limit enforces threshold per IP per second.
- Load balancing halves bandwidth impact or doubles capacity (assert via effective capacity helper).
- Blocking TCP causes HTTP_GET to be rejected and happiness to decrease.

### 12) Performance Caps & Stability
Deliverables:
- Enforce `MAX_ACTIVE_PARTICLES`, `VISUAL_SPAWN_CAP_PER_SECOND`; use `trafficWeight` to keep server load accurate when visually capped; ensure analyzer log budget `UI_ANALYZER_LOG_MAX_PER_SECOND` is respected.
Tests:
- Active particles never exceed cap.
- When desiredPps > cap, `trafficWeight` scales load effect.
- Analyzer log count per second obeys cap.

### 13) Deploy Readiness
Deliverables:
- Update README with setup/run/build/test instructions.
- Ensure `npm run build:css` works cleanly and outputs `css/main.css`.
- Confirm `npm test` green.
Tests:
- Build script succeeds (integration smoke in CI or local).
- Test suite all passing.

## Notes
- Prefer pure functions for testability; keep rendering and DOM thin wrappers.
- Use test doubles for RAF, time, and canvas where practical.
- Keep ASCII-only identifiers/comments; concise comments only where logic is non-obvious.
