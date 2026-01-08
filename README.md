# DoS/DDoS Attack Simulator

An interactive educational simulator demonstrating Denial of Service (DoS) and Distributed Denial of Service (DDoS) attacks, designed to teach network security concepts aligned with WJEC GCSE Computer Science curriculum.

## Features

- **Visual Packet Simulation**: Real-time visualization of network traffic with distinct packet types (HTTP, UDP, ICMP, TCP SYN)
- **Attack Types**: Simulate UDP flood, ICMP flood, and TCP SYN flood attacks
- **Mitigation Controls**: Interactive firewall with protocol blocking, IP blacklisting, rate limiting, and load balancing
- **Server Monitoring**: Live bandwidth, CPU, and user happiness metrics
- **Educational Focus**: Demonstrates false positive risks and mitigation trade-offs

## Prerequisites

- Node.js (v16 or higher recommended)
- Modern web browser (Chrome, Firefox, Edge, or Safari)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Bassaleg-School/DoSAttackSimulator.git
cd DoSAttackSimulator
```

2. Install dependencies:
```bash
npm install
```

3. Build CSS:
```bash
npm run build:css
```

## Usage

### Development Mode

To run the simulator in development mode with CSS auto-rebuild:

```bash
npm run dev:css
```

Then open `index.html` in your web browser.

### Production Build

Build optimized CSS for production:

```bash
npm run build:css
```

### Running Tests

Run the complete test suite:

```bash
npm test
```

## How to Use the Simulator

### Starting a Simulation

1. Click **Start Simulation** to begin legitimate user traffic
2. Adjust **Device Count** and **Attack Type** in the Attacker panel
3. Click **Start Attack** to launch a DoS/DDoS attack
4. Monitor server health metrics and user happiness

### Mitigation Strategies

Open the **Firewall & Mitigation** panel to access:

- **Protocol Filtering**: Block TCP, UDP, or ICMP traffic
  - ⚠️ Warning: Blocking TCP stops legitimate web traffic!
- **IP Blacklisting**: Block traffic from detected botnet subnets
- **Rate Limiting**: Limit requests per second per IP address
- **Load Balancing**: Double the server's bandwidth capacity

### Understanding the Visualization

- **Green Circles (●)**: Legitimate HTTP traffic from users
- **Red Squares (■)**: UDP flood attack packets
- **Orange Squares (■)**: ICMP flood attack packets
- **Red Triangles (▲)**: TCP SYN attack packets
- **Lock Icons (🔒)**: Active half-open connections on the server
- **Grey Particles**: Blocked by firewall
- **Black Particles**: Dropped due to congestion

### Key Concepts Demonstrated

- **DoS vs DDoS**: Single source vs distributed attack sources
- **Volume Attacks**: Bandwidth saturation (UDP, ICMP)
- **Protocol Attacks**: Resource exhaustion (TCP SYN)
- **False Positives**: How aggressive filtering can block legitimate users
- **Mitigation Trade-offs**: Balancing security with user experience

## Architecture

The simulator is built as a client-side Single Page Application (SPA) using:

- **Vanilla JavaScript (ES6+)**: No runtime frameworks
- **Tailwind CSS**: Build-time styling
- **HTML5 Canvas**: High-performance particle rendering
- **Vitest**: Unit and integration testing

### Project Structure

```
/
├── index.html              # Main entry point
├── js/
│   ├── main.js            # Application bootstrap
│   ├── constants.js       # Configuration values
│   ├── utils.js           # Helper functions
│   ├── core/              # Core engine
│   │   ├── GameLoop.js
│   │   ├── Orchestrator.js
│   │   └── CanvasRenderer.js
│   ├── models/            # Business logic
│   │   ├── Packet.js
│   │   ├── Server.js
│   │   ├── Attacker.js
│   │   ├── GenuineTraffic.js
│   │   └── Firewall.js
│   └── ui/                # UI management
│       ├── UIManager.js
│       └── EventHandlers.js
├── css/
│   └── main.css           # Generated styles
├── src/
│   └── input.css          # Tailwind input
└── tests/                 # Test suite
    ├── core/
    ├── models/
    ├── ui/
    └── integration/
```

## Educational Use

This simulator is designed for:

- **KS3 Digital Technology** students learning about network security
- **GCSE Computer Science** (WJEC Unit 2) covering DoS/DDoS attacks
- **Classroom demonstrations** of cyber attack concepts
- **Independent study** of network security principles

### Learning Objectives

Students will understand:

1. The difference between DoS and DDoS attacks
2. How volume-based and protocol-based attacks work
3. The challenges of mitigating attacks without blocking legitimate traffic
4. Why simple IP filtering fails against large botnets
5. The concept of false positives in security

## License

MIT

## Contributing

This is an educational project for Bassaleg School. For issues or suggestions, please open a GitHub issue.

## Acknowledgments

Built to support WJEC GCSE Computer Science curriculum requirements.
