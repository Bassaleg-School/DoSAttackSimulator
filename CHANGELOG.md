# Changelog

All notable changes to the specification are documented in this file.

## [1.3.0] - 2026-01-08
- Clarify that the attacker device-count slider describes a strict 1-1000 range so the UI guidance now matches the control limits documented elsewhere in `SPEC.md` and `constants.js`.
- Split the UDP/ICMP legend into separate colour callouts, ensuring ICMP flood packets are always described as orange squares per the v1.3 visual alignment notes.

## [1.2.0] - 2026-01-08
- Add **Reverse Proxy / DDoS Protection** mitigation to `SPEC.md`: models Public IP (proxy) vs Origin IP, origin shielding, and proxy egress addressing.
- Add visualization and canvas behaviour for the proxy node (proxy checkpoint at `proxyX`) and cyan-coloured forwarded packets to distinguish proxy→origin traffic.
- Define packet metadata additions (`destinationIP`, optional `clientIP`) and constants (`VICTIM_PUBLIC_IP`, `PROXY_PUBLIC_IP`, `PROXY_EGRESS_IP_PREFIX`, `REVERSE_PROXY_ENABLED`).
- Clarify Firewall behaviour when proxy is enabled (use `clientIP` for rate-limiting/blacklisting where available) and that blocked packets are dropped at the edge.
- Update UI requirements to display Origin IP always and display Public IP when reverse proxy is enabled.

## [1.1.0] - 2026-01-08
- Clarify that `Happiness` now recalculates in real-time and will recover as dropped legitimate packets decrease (e.g., after attack mitigation), unless genuine users remain blocked by firewall rules.
- Add top-of-file metadata header in `SPEC.md` and reference to this changelog.

## [1.0.0] - initial
- Initial specification (v1.0.0) describing UI layout, simulation logic, and core mechanics for the DoS/DDoS Attack Simulator.
