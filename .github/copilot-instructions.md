## Project Summary
A compact educational Single-Page Application (SPA) that visualises DoS/DDoS attacks and mitigations for classroom teaching. It uses HTML5 Canvas for traffic particles, Tailwind CSS for styling, and vanilla ES modules for simulation logic. Refer to `README.md` and `SPEC.md` for pedagogy and technical details.

## Key Rules (Must follow)

- **SPEC is the source of truth.** Any change to behaviour, simulation logic, constants, UX text, UI layout, or assets that affects how the simulator works **must** be reflected in `SPEC.md`. Update the appropriate section (e.g. "Network Visualization", "Mitigation & Firewall", "Simulation Logic") with a clear description of the change and why it preserves learning outcomes.

- **Semantic version the spec.** When you change `SPEC.md`:
  - Bump the Spec-Version in `SPEC.md` following semantic versioning rules (MAJOR.MINOR.PATCH). Example: `1.3.0` → `1.4.0` for a backward-compatible feature, `1.3.1` for a bugfix.
  - Add a short changelog entry to `CHANGELOG.md` summarizing the change (one line plus brief rationale).

- **Keep code + spec + tests together.** Every behavioural change must include:
  1. Code changes (in `js/` or other relevant files)
  2. Corresponding `SPEC.md` update with version bump
  3. A `CHANGELOG.md` entry describing the change
  4. Tests (unit and/or integration) that assert the new behaviour

- **PR hygiene.** Open PRs should include:
  - A link to the updated `SPEC.md` and `CHANGELOG.md` lines.
  - A short description of how the change maps to the pedagogical goals in the spec.
  - Test coverage notes and any manual checks performed (e.g., UI flows).

## File Layout (key files)
```
index.html              # Main entry point
js/
  main.js               # Application bootstrap
  constants.js          # Configuration values (update SPEC when changing)
  utils.js              # Helper functions
  core/                 # Game loop and renderer
    GameLoop.js
    Orchestrator.js
    CanvasRenderer.js
  models/               # Business logic and simulation models
    Packet.js
    Server.js
    Attacker.js
    GenuineTraffic.js
    Firewall.js
  ui/                   # DOM and event handling
    UIManager.js
    EventHandlers.js
css/
  main.css              # Generated Tailwind output (run build:css)
src/
  input.css             # Tailwind input
tests/                  # Vitest test suite (unit + integration)
```

## Testing & CI 🔧
- Tests live in `tests/` and use Vitest. Run the suite with:

```bash
npm test
```

- **Add tests** for any change in simulation math, packet handling, mitigation logic, or UI logging. Prefer small, focused unit tests for model logic and integration tests for scenario-level expectations.

- **Performance-sensitive changes** (renderer, spawn rates, visual scaling) should include basic performance assertions (e.g., visual spawn rate caps, `trafficWeight` math) and be validated against the target FPS and active particle caps.

## Development Workflow & Advice
- Maintain the MVC split: keep DOM logic in `ui/`, engine/game-loop in `core/`, and business logic in `models/`.
- When changing constants, update the `constants.js` excerpt in `SPEC.md` if the constant affects simulation behaviour or UI expectations.
- If you touch Tailwind input files (`src/input.css`) or UI styles, run the CSS build (`npm run build:css`) and ensure `css/main.css` is updated when relevant.
- Keep changes small and atomic — prefer multiple small PRs over a large, sweeping change.

## Changelog & Versioning Examples
- Bugfix: Fix an off-by-one in packet weight calculation → bump `SPEC.md` patch: `1.3.0` → `1.3.1` and add a short `CHANGELOG.md` entry under [1.3.1].
- New feature: Add Reverse Proxy node visualization → bump minor: `1.3.0` → `1.4.0`, describe behaviour in "Network Visualization" and "Reverse Proxy / DDoS Protection" sections, and include tests that assert proxy’s egress addressing and clientIP preservation.

---

## Quick PR checklist ✅
- [ ] Updated `SPEC.md` (with Spec-Version bumped)
- [ ] Added line to `CHANGELOG.md`
- [ ] Added/updated tests (pass locally with `npm test`)
- [ ] Documented pedagogical impact in the PR description
- [ ] If UI/CSS changed: ran `npm run build:css` and committed `css/main.css` if necessary


