# Action Plan for DoS/DDoS Simulator (TDD with Vitest)

## Working Assumptions
- Frontend-only SPA, vanilla ES modules, Tailwind CLI for CSS (build-time only).
- Tests: Vitest (dom-less unit tests unless noted with DOM/canvas mocks).
- Code layout per SPEC: `index.html`, `js/**`, `src/input.css`, generated `css/main.css` committed.
- Dark theme using Tailwind palette (slate/emerald/amber/red). No extra runtime deps.

## Milestones
Each milestone is a commit boundary with green tests.

### 1) Tooling & Skeleton ✅
Deliverables:
- `package.json` with scripts: `dev:css`, `build:css`, `test` (vitest), `lint` (optional).
- `tailwind.config.js` scanning `index.html`, `js/**`.
- `src/input.css` with Tailwind directives; generated `css/main.css` (committed).
- `index.html` scaffold: top control bar + three columns (placeholders present).
- Vitest config and sample passing test.
Status:
- Implemented Tailwind/Vitest tooling, initial layout scaffold, and generated `css/main.css`.
- `npm test` passing (sample assertion), `npm run build:css` generates CSS.

### 2) Constants & Utilities ✅
Deliverables:
- `js/constants.js` with all values from SPEC (ranges, colors, thresholds).
- `js/utils.js` helpers: `clamp`, random IP generator avoiding 172.16.0.x, subnet extractor (/24), rand choice.
Status:
- Added enums for packet/attack/status/protocols and full constants table aligned to SPEC.
- Implemented utility helpers (`clamp`, random IP generation with exclusion, /24 subnet extraction, random choice, sequential IP helper) with Vitest coverage.
Tests:
- Constants value snapshot and range checks pass.
- Utility suite validates clamping, IP generation exclusion, subnet extraction, random choice, and sequential IPs.

### 3) Models: Packet & GenuineTraffic ✅
Deliverables:
- `Packet` class with position, speed, type enum, isMalicious inference for HTTP_GET, sourceIP, payloadSize, optional `trafficWeight`.
- `GenuineTraffic` producing 50 HTTP_GET packets/sec from 172.16.0.1-50 evenly/randomly with accumulator handling fractional dt.
Status:
- Implemented Packet model and GenuineTraffic generator with sequential IP pool and spawn accumulator.
Tests:
- Packet defaults/isMalicious inference verified; IP ranges bounded to 172.16.0.1-50; rate math matches 50 pps with fractional dt accumulation.

### 4) Attacker Model ✅
Deliverables:
- State: deviceCount, attackType (UDP, TCP_SYN, ICMP), targetIP, bandwidthMultiplier, isAttacking, botnetRanges.
- `generateBotnetRanges()` 1 /24 per 20 devices, avoids 172.16.0.* with guarded generation + deterministic fallback for uniqueness.
- `spawnPacket()` honors attackType base rates; visual cap applied with `trafficWeight` to preserve load math.
- Desired PPS = deviceCount × baseRate × bandwidthMultiplier; visualPps = min(desiredPps, VISUAL_SPAWN_CAP_PER_SECOND).
Status:
- Implemented Attacker with rate math, botnet range generation, packet spawning and trafficWeight scaling.
Tests:
- Range count matches ceil(devices/20) and excludes genuine subnet; base rates mapped by attack type; desired vs visual PPS with trafficWeight verification; accumulator honors fractional dt.

### 5) Server Model ✅
Deliverables:
- State: bandwidthUsage, cpuLoad, activeConnections (with TTL), happinessScore, droppedPackets, status (ONLINE/DEGRADED/CRASHED).
- `receive(packet)`: volume attacks raise bandwidth; SYN adds connection and CPU; HTTP_GET succeeds unless load ≥99/crashed, then drop legit.
- `update(dt)`: decay bandwidth (10%/s) and CPU (2%/s), expire SYN connections per TTL, recompute status thresholds (90/99 with recovery below 90), update happiness = 100 - dropped×2 clamped.
- Crash halts processing but auto-recovers when below recovery threshold.
Status:
- Implemented load tracking, TTL-based half-open connections, decay, crash gating, and happiness clamping.
Tests:
- Volume increase/decay, SYN add+TTL expiry, status transitions (degraded/crashed/recover), HTTP_GET drop when crashed with happiness penalty validated.

### 6) Firewall Model ✅
Deliverables:
- State: blockedProtocols, blockedIPs (/24 strings), rate limiting (threshold, per-IP counters, reset per second, protocol scope), loadBalancingEnabled flag, detected subnets tracking.
- `inspect(packet)` returns {allowed, reason}; applies protocol block, /24 blacklist, rate limit when enabled and dashboard open, respecting protocol scope or ALL.
- `getDetectedSubnets()` aggregates seen /24s.
Status:
- Implemented firewall with protocol/IP blocking, gated rate limiting, per-IP counters, protocol scopes, detected subnet tracking.
Tests:
- Protocol blocks for TCP (HTTP_GET/TCP_SYN) and individual UDP/ICMP; subnet blacklist; rate limit window reset and scope behavior; inactive when dashboard closed; detected subnet accumulation.

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
