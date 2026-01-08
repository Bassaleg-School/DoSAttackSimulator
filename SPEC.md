# **Functional Specification: Interactive DoS/DDoS Attack Simulator**

---
Spec-Version: 1.4.0
Last-Updated: 2026-01-08
Changelog: CHANGELOG.md
Summary: Adds packet visual scaling, network node badges (attackers/legit/proxy/origin), and aligns metrics with aggregate badge counts
---

## **1\. Pedagogical Overview & Curriculum Links**

Target Audience: KS3 Digital Technology / GCSE Computer Science (WJEC).  
Goal: To simulate the mechanics of DoS/DDoS attacks and the complexity of mitigating them without blocking genuine users.  
**Key Concepts (WJEC Unit 2):**

* **DoS vs DDoS:** The difference in scale and source.  
* **Attack Vectors:** Volume-based (Bandwidth saturation) vs. Protocol-based (Resource exhaustion).  
* **Mitigation:** Firewalls (IP/Protocol filtering), Blacklisting/Whitelisting, and the concept of "False Positives."

**Pedagogical Approach:**

* **Concrete Fading:** Moving from visual particles (concrete) to server logs (abstract).  
* **Cause & Effect:** Immediate visual feedback when variables (device count, filters) change.

## **2\. Interface Layout (The Three Zones)**

The screen is divided into three distinct columns to represent the flow of data.

### **A. Left Panel: The Attacker (The Threat Actor)**

  * **Device Count Control (Slider):**  
    * **Range:** 1-1000 devices (DoS → DDoS scaling).  
  * **Visual Change:** Icon changes from a single hooded figure to a global network map as the number increases.  
* **Target Selection:**  
  * Input field for IP Address (defaults to the Victim **Public IP**).
  * **Clarification (v1.2):** The victim may be fronted by a Reverse Proxy mitigation, in which case the Public IP is the proxy IP and the origin server IP is not directly reachable.
* **Attack Method (Dropdown):**  
  * **UDP Flood (Volume):** High speed, fills the pipe.  
  * **SYN Flood (Protocol):** Sticks to the server, fills memory.  
  * **ICMP Flood (Volume):** Ping flood.  
* **Botnet Configuration (New Feature):**  
  * **IP Range Display:** Shows the simulated IPs of the attacking devices (e.g., 192.168.1.x, 10.5.20.x).  
  * *Note:* This is crucial for the Firewall activity later.

### **B. Middle Panel: The Network (The Visualisation)**

* **The Pipe (Bandwidth):** A visual conduit connecting Left to Right.  
  * **Traffic Particles:**
    * **Green Circles (●):** Genuine Users (IP Range: 172.16.0.x). Move at steady pace.  
    * **Red Squares (■):** UDP Malicious Traffic (Volume attacks).  
    * **Orange Squares (■):** ICMP Malicious Traffic (Volume attacks).  
    * **Red Triangles (▲):** TCP SYN Malicious Traffic (Protocol attacks).  
      * *Volume Attack:* Swarms of red/orange squares physically blocking green circles.  
      * *Protocol Attack:* Red triangles arrive and turn into "lock" icons (🔒) on the server, staying there.  
* **Network Nodes (v1.3):** Show four glyphs on/around the canvas: **Attackers** (left cluster badge = malicious device count), **Legit Users** (left cluster badge = 50), **Proxy** (when enabled, badge = current Public IP with a UI toggle to switch the badge to the aggregate in-flight count), and **Origin Server** (right, status badge). Connect them with lines that glow for allowed flow and dim/pulse when blocked.  
* **Particle Legend:** A static legend displayed below the canvas showing:  
  * ● Green Circle = Legitimate HTTP Traffic  
  * ■ Red Square = UDP Flood Packet  
  * ■ Orange Square = ICMP Flood Packet  
  * ▲ Red Triangle = TCP SYN Packet  
  * 🔒 Lock Icon = Active Half-Open Connection

**Clarification (v1):** ICMP packets are rendered as **orange squares** (distinct from UDP red squares) to make protocol differences visually obvious.

### **C. Right Panel: The Victim (The Server)**

* **Server Health Bars:**  
  1. **Bandwidth:** Fills up during Volume attacks.  
  2. **CPU/RAM:** Fills up during Protocol attacks.  
* **Service Status Thresholds:**  
  * **Online (Green):** Load < 90%.  
  * **Degraded (Amber):** Load ≥ 90% and < 99%.  
  * **Crashed (Red):** Load ≥ 99%. Server stops processing all traffic until manually reset or load drops below 90%.  
* **Genuine User Feedback:**  
  * A live feed text log: "User A (172.16.0.5) accessed Index.html... SUCCESS" or "User B... TIMEOUT".  
  * **Happiness Score:** A percentage representing user satisfaction (see Section 4 for calculation).

## **3\. Mitigation & Firewall Features (The Active Learning Component)**

This is the core interactive element where students must solve the problem.

### **The Mitigation Menu**

A dashboard available to the "Victim" with the following tools:

#### **1\. The Traffic Analyzer (Sniffer)**

* A scrolling log window showing recent requests.  
* **Purpose:** Students must read this to find patterns. They will see many requests coming from specific IP ranges (e.g., 56.22.10.\*) or using specific protocols.

#### **2\. The Firewall (Advanced Filtering)**

Allows the student to configure rules to block traffic.

* **Protocol Filtering:**  
  * Checkboxes: ☐ Block TCP | ☐ Block UDP | ☐ Block ICMP  
  * **Learning Outcomes by Protocol:**  
    * *Block UDP:* Safe for legitimate traffic. Stops UDP floods with no false positives.  
    * *Block ICMP:* Safe for legitimate traffic. Stops ICMP floods with no false positives. (Note: In reality, blocking ICMP can cause network diagnostic issues, but this is simplified for pedagogy.)  
    * *Block TCP:* **DANGEROUS!** Stops SYN floods BUT also blocks all legitimate HTTP traffic (which uses TCP), resulting in a "Self-Inflicted DoS." Happiness immediately drops to 0%.  
* **IP Range Filtering (Blacklisting):**  
  * A dynamic list of detected IP subnets.  
  * Students can toggle "Block" next to specific ranges.  
  * *The Trap:* The list includes the Botnet ranges AND the Genuine User range (172.16.0.x).  
  * *The Difficulty:* As the attack scale increases (DDoS), the number of attacking IP ranges increases. The student attempts to block them one by one ("Whac-A-Mole"), illustrating why simple IP filtering fails against large botnets.

#### **3\. Other Mitigations (Simplified Toggles)**

* **Load Balancing:** Doubles the effective bandwidth capacity. Visually renders as two parallel pipes.  
* **Rate Limiting:**  
  * **Default:** 20 requests/second per IP.  
  * **Configurable:** Slider allows 5-50 requests/sec.  
  * **Behaviour:** Automatically drops traffic if it exceeds the threshold from a single IP. Counter resets every second.  
  * *Effectiveness:* Highly effective against DoS (single source), less effective against DDoS (distributed sources).

#### **4\. Reverse Proxy / DDoS Protection (New Feature)**

This mitigation represents placing a managed Reverse Proxy / DDoS scrubbing service *in front* of the victim.

* **Core Concept (technical fidelity):**
  * The victim has an **Origin IP** (the real server address) and a **Public IP** (the address attackers/users target).
  * When the Reverse Proxy is enabled, the **Public IP changes** to a **Proxy IP**. Legitimate users automatically follow the Public IP (simulates DNS pointing at the proxy).
  * The origin server becomes **origin-shielded**: it only accepts inbound packets that come **from the proxy network**.

* **Player-visible behaviour:**
  * **Enabling Reverse Proxy** immediately reduces successful attack impact *unless* the attacker retargets the new Public IP.
  * The Attacker Panel Target IP input remains editable; attacks only “land” if the target matches the victim **Public IP**.
  * The Victim Panel should display both:
    * **Public IP (what the internet sees)**
    * **Origin IP (server address)**
  * **Node visual (v1.3):** The canvas shows a **Proxy** node between the attacker/legit clusters and the origin; lines animate in two hops (Internet → Proxy → Origin) to reinforce shielding and IP change.

* **Traffic / filtering behaviour:**
  * The proxy performs **L3/L4 scrubbing**:
    * Drops obviously malicious traffic according to active Firewall / rate-limit rules (conceptually “at the edge”).
    * For **TCP SYN floods**, the proxy acts as a **SYN proxy** so half-open connections do not accumulate on the origin.
  * The proxy has a high but finite capacity; it can still be saturated at extreme DDoS settings.

* **Logging / analysis fidelity:**
  * The Traffic Analyzer should show (when proxy is enabled) both:
    * **Client IP** (original bot/user source)
    * **Edge IP** (proxy egress IP seen by the origin)
    * **Destination IP** (victim Public IP)
  * **Learning outcome:** students see why naive IP blocking can fail if everything appears to originate from the proxy, and why reverse proxies commonly preserve client IP via headers / metadata.

## **4\. Simulation Logic & Sandbox Environment**

The simulator operates as a fully open sandbox. Students are not guided through pre-set levels; they must manually configure the variables on the Attacker Panel to test hypotheses. The "scenarios" below serve as examples of outcomes the engine must support based on student configuration.

### **Configurable Variables (Attacker Side)**

* **Device Count:** Slider allows 1 to 1000+ (Linear scaling of particle generation).  
* **Attack Bandwidth (New):** Slider to adjust the data rate/packet size per device (simulates connection speed of the botnet).  
* **Attack Type:** Dropdown allows selection of UDP (High bandwidth), TCP SYN (High CPU), or ICMP.  
* **Target IP:** Students can type any IP; attack only registers if it matches the Victim **Public IP**.

### **Configurable Variables (Victim Side)**

* **Server Bandwidth Capacity:** Slider allows upgrading the server connection (e.g., increasing the size of the "pipe" from 100Mbps to 10Gbps).  
  * *Pedagogical Value:* Demonstrates that buying more bandwidth ("Scaling Up") is a valid mitigation for Volume attacks, though often expensive.

### **Genuine User Traffic**

* **User Count:** Fixed at 50 simulated legitimate users.  
* **Traffic Pattern:** Each user sends 1 HTTP request per second (TCP-based).  
* **IP Range:** All genuine users come from the 172.16.0.x subnet (172.16.0.1 - 172.16.0.50).

### **Happiness Score Calculation**

The Happiness Score represents how well legitimate users are being served:

* **Starting Value:** 100%  
* **Drops When:**  
  * A genuine user packet is dropped (server overloaded, bandwidth full, or blocked by firewall).  
  * **Formula:** `Happiness = 100 - (droppedPackets × 2)`, clamped to 0-100.  
  * Each dropped legitimate packet reduces happiness by 2%.  
* **Recovery:** Happiness recalculates in real-time using the formula above. As the number of dropped legitimate packets decreases (for example after the attack is mitigated and genuine traffic is being successfully served), Happiness will gradually recover toward 100%, clamped to 0-100. Recovery will not occur while genuine users are still being blocked by firewall rules. The `Reset Simulation` button still immediately restores Happiness to 100%.  
* **Aggregate drop counting (v1.3):** `droppedPackets` is incremented by the packet’s `trafficWeight` (which already includes `PACKET_VISUAL_SCALE`), so happiness aligns with the aggregate badge counts and not just the number of rendered particles.
* **False Positive Penalty:** If the firewall blocks a genuine user (172.16.0.x range), it counts as a dropped packet.  

### **Packet Generation Rates**

The number of packets generated per second depends on the attack configuration:

* **Legitimate Traffic:** 50 packets/second total (1 per user).  
* **Malicious Traffic Formula:** `packetsPerSecond = deviceCount × baseRate × bandwidthMultiplier`  
  * **Base Rates by Attack Type:**  
    * UDP Flood: 10 packets/sec per device (high volume).  
    * ICMP Flood: 8 packets/sec per device (medium-high volume).  
    * TCP SYN Flood: 5 packets/sec per device (lower volume, but sticks).  
  * **Bandwidth Multiplier:** Attack Bandwidth slider scales from 0.5× to 2×.

### **Botnet IP Range Generation**

When the attack starts, the simulator generates random IP ranges for the botnet:

* **Range Allocation:** 1 unique /24 subnet per 20 devices (e.g., 50 devices = 3 subnets).  
* **Example Subnets:** 45.33.12.x, 103.55.8.x, 78.12.201.x (randomly generated, avoiding 172.16.0.x).  
* **Display:** The detected subnets appear in the Traffic Analyzer and IP Blocking list.

### **Collision & Blocking Behaviour**

When the server's bandwidth reaches capacity:

* **Visual Effect:** Green circles (legitimate packets) slow down and bounce back from the congested pipe.  
* **Mechanical Effect:** Bounced packets count as "dropped" and trigger a TIMEOUT in the user log.  
* **Threshold:** Blocking begins when bandwidth usage exceeds 95%.

**Clarification (v1):**

* If a packet is blocked by the firewall, it is dropped **before** reaching the server, turns **grey**, and quickly disappears.
* If a legitimate packet is dropped due to overload/timeout (not firewall), it turns **black** and quickly disappears.

### **Simulation Controls**

The interface includes the following control buttons:

* **Start Simulation:** Begins the simulation with legitimate traffic only (no attack). Server processes normal requests.  
* **Stop Simulation:** Pauses all activity. Packets freeze in place.  
* **Start Attack:** Activates the attacker with current configuration. Malicious packets begin flowing.  
* **Stop Attack:** Stops generating new malicious packets. Existing packets continue to their destination.  
* **Reset Simulation:** Clears all packets, resets server health to 0%, happiness to 100%, and returns to initial state.

### **Example Student-Created Scenarios**

#### **Example A: The Single DoS (Student Configures: 1 Device)**

* **Visual:** Single stream of red dots.  
* **Outcome:** Server slows down but survives.  
* **Solution:** Rate Limiting (blocks the single IP easily).

#### **Example B: The Volume DDoS (Student Configures: 500+ Devices, UDP)**

* **Visual:** Pipe is saturated. Green dots bounce off.  
* **Outcome:** Server crashes due to Bandwidth limit.  
* **Solution:** Load Balancing (mitigates) OR IP Filtering (hard work).

#### **Example C: The Protocol Attack (Student Configures: TCP SYN)**

* **Visual:** Red triangles arrive and turn into lock icons (🔒) on the server. Bandwidth is fine, but CPU fills up.  
* **Outcome:** Server crashes due to CPU/Memory limit.  
* **Bad Solution:** Blocking TCP (Stops genuine users → Happiness 0%).  
* **Good Solution:** Rate Limiting (limits connections per IP) combined with IP blocking for the most aggressive botnets.

## **5\. Activity Outcome (v1)**

This simulator is a **live sandbox** rather than a timed win/lose game.

* There is **no attack timer**, **no win condition**, and **no automatic lose screen**.
* The attacker can start/stop the attack at any time to change variables and observe cause/effect.
* The UI should still clearly show when the server is **Online / Degraded / Crashed** and how **Happiness** changes.

# 

# 

# **Technical Specification: DoS/DDoS Simulator**

## **1\. Architectural Overview**

The application will be built as a **client-side Single Page Application (SPA)**. It will utilise the **Model-View-Controller (MVC)** architectural pattern to separate the simulation logic (Model) from the user interface (View) and the game loop (Controller).

* **Runtime:** Modern Browser (Chrome, Edge, Firefox, Safari).  
* **Language:** Vanilla JavaScript (ES6+).  
* **Module System:** Native ES Modules (\<script type="module"\>).  
* **Rendering:**  
  * **UI Panels:** Standard DOM (HTML/CSS) for accessibility and ease of layout.  
  * **Traffic Simulation:** HTML5 Canvas API for high-performance rendering of 1,000+ particle entities.  
* **Hosting:** GitHub Pages (Static hosting).

### **1.2 Clarifications & Non-Goals (v1)**

To keep implementation unambiguous for a coding agent, the following decisions apply to v1:

* **ICMP colour:** ICMP packets render as **orange squares**.
* **SYN behaviour:** SYN packets create half-open connections shown as 🔒 locks that **expire** after a fixed TTL (see constants) rather than persisting forever.
* **Crash behaviour:** The server **auto-recovers** from CRASHED once load drops below the recovery threshold (no manual reset required, though Reset exists).
* **Botnet ranges:** Botnet /24 subnets are generated **when the attack starts** and remain fixed until the next Start Attack.
* **Live sandbox:** No win/lose overlays and no countdown timer.
* **Out of scope:** No audio, no persistence, no external files/data, no mobile layout.

## **1.1 UI Styling & Build Tooling (Tailwind CSS CLI)**

To keep the app lightweight while still achieving a clean, consistent UI, styling will be implemented with **Tailwind CSS** using the **Tailwind CLI** as a *build-time* dependency.

* **Runtime dependencies:** None (no frameworks, no CSS-in-JS).  
* **Build-time dependency:** Tailwind CSS CLI (single dependency) to generate `css/main.css`.

### **Build Pipeline Requirements**

* The repository includes:
  * `package.json` with scripts to build CSS.
  * `tailwind.config.js` configured to scan `index.html` and all JS modules in `js/**`.
  * `src/input.css` containing Tailwind directives.
* A build must be run before deploying to GitHub Pages to ensure the generated CSS exists in `css/main.css`.

**Deployment note (GitHub Pages):** GitHub Pages is assumed to serve the site from the repository root. Keep `index.html`, `css/main.css`, and `js/**` at the repo root for v1. (A `/site` subfolder deployment flow would require an explicit deploy step/branch and is out of scope for v1.)

### **Recommended Scripts (package.json)**

* `npm run dev:css` → watches and regenerates CSS during development.  
* `npm run build:css` → generates minified production CSS.  

Example commands (illustrative):

```bash
npm install
npm run dev:css
npm run build:css
```

### **Tailwind Input File (src/input.css)**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## **2\. Directory & File Structure**

To ensure maintainability, the code is split by responsibility.

```
/
├── index.html              # The main entry point (Skeleton structure)
├── package.json            # Build tooling (Tailwind CLI scripts)
├── package-lock.json       # Lockfile for deterministic builds
├── tailwind.config.js      # Tailwind configuration
├── src/
│   └── input.css           # Tailwind input file (@tailwind base/components/utilities)
├── css/
│   └── main.css            # Generated CSS output (committed for GitHub Pages)
├── js/
│   ├── main.js             # Entry point: Instantiates the App and starts the Loop
│   ├── constants.js        # Global configuration (Simulation + UI constants)
│   ├── utils.js            # Helper functions (Random IP generator, Range clamping)
│   │
│   ├── core/               # Core Engine Logic
│   │   ├── GameLoop.js     # Handles requestAnimationFrame and delta time
│   │   └── CanvasRenderer.js # Handles drawing the "Pipe" and particles
│   │
│   ├── models/             # Business Logic (The "Backend" logic)
│   │   ├── Packet.js       # Class representing a single data packet
│   │   ├── Server.js       # Manages Victim health, resources, and status
│   │   ├── Attacker.js     # Manages attack configuration and malicious packet generation
│   │   ├── GenuineTraffic.js # Manages legitimate user traffic generation
│   │   └── Firewall.js     # Logic for filtering packets (ACLs, Rules)
│   │
│   └── ui/                 # DOM Manipulation
│       ├── UIManager.js    # Updates DOM elements (Health bars, Logs)
│       └── EventHandlers.js# Binds clicks and sliders to Model updates
```

## **3\. Data Models (The Logic Layer)**

### **3.0 Constants (constants.js)**

All configurable values should be defined in a central constants file:

```javascript
// Victim / Addressing
VICTIM_ORIGIN_IP: "203.0.113.10", // fixed origin server IP (documentation/test range)
VICTIM_PUBLIC_IP: "203.0.113.10", // defaults to origin; may change when Reverse Proxy is enabled

// Reverse Proxy / DDoS Protection
REVERSE_PROXY_ENABLED: false,
PROXY_PUBLIC_IP: "198.51.100.20", // proxy front-door IP (documentation/test range)
PROXY_EGRESS_IP_PREFIX: "198.51.100", // origin will see traffic from this network when proxy is enabled
ORIGIN_SHIELDING_ENABLED: true,

// Traffic Generation
GENUINE_USER_COUNT: 50,
GENUINE_PACKETS_PER_USER_PER_SEC: 1,
GENUINE_IP_PREFIX: "172.16.0",

// Attack Rates (packets per second per device)
ATTACK_RATE_UDP: 10,
ATTACK_RATE_ICMP: 8,
ATTACK_RATE_TCP_SYN: 5,

// Bandwidth Multiplier Range
BANDWIDTH_MULTIPLIER_MIN: 0.5,
BANDWIDTH_MULTIPLIER_MAX: 2.0,

// Device Count Range
DEVICE_COUNT_MIN: 1,
DEVICE_COUNT_MAX: 1000,

// Server Thresholds
SERVER_DEGRADED_THRESHOLD: 90,
SERVER_CRASHED_THRESHOLD: 99,
SERVER_RECOVERY_THRESHOLD: 90,

// Server Decay Rates (% per second)
BANDWIDTH_DECAY_RATE: 10,
CPU_DECAY_RATE: 2,

// Rate Limiting
RATE_LIMIT_DEFAULT: 20,
RATE_LIMIT_MIN: 5,
RATE_LIMIT_MAX: 50,

// Happiness Calculation
HAPPINESS_PENALTY_PER_DROP: 2,

// Botnet IP Generation
DEVICES_PER_SUBNET: 20,

// Packet Visual Scaling (v1.3)
PACKET_VISUAL_SCALE: 100, // each rendered particle represents this many real packets
PACKET_VISUAL_SCALE_MIN: 10,
PACKET_VISUAL_SCALE_MAX: 1000,
PACKET_VISUAL_SCALE_LABEL: "×", // prefix used in legend/logs (e.g., "×100")

// SYN / Half-open connections
SYN_CONNECTION_TTL_SECONDS: 15,
MAX_ACTIVE_CONNECTIONS: 100,

// Canvas
CANVAS_WIDTH: 1000,
CANVAS_HEIGHT: 400,
PIPE_WIDTH: 800,
PIPE_HEIGHT: 80,

// UI Layout (pixels)
UI_MIN_VIEWPORT_WIDTH: 1200,
UI_CONTROL_BAR_HEIGHT: 56,
UI_PANEL_LEFT_WIDTH: 320,
UI_PANEL_RIGHT_WIDTH: 380,
UI_PANEL_LEFT_MIN_WIDTH: 260,
UI_PANEL_RIGHT_MIN_WIDTH: 320,
UI_MIDDLE_MIN_WIDTH: 520,
UI_PANEL_GAP: 16,
UI_PANEL_PADDING: 16,
UI_BORDER_RADIUS: 12,
UI_LOG_MAX_ENTRIES: 50,
UI_ANALYZER_LOG_MAX_PER_SECOND: 10,

// UI Theme (Tailwind palette names; no custom colours)
UI_THEME_MODE: "dark",
UI_THEME_BG: "slate-950",
UI_THEME_SURFACE: "slate-900",
UI_THEME_SURFACE_ALT: "slate-800",
UI_THEME_TEXT: "slate-100",
UI_THEME_TEXT_MUTED: "slate-300",
UI_THEME_BORDER: "slate-700",
UI_THEME_ACCENT: "emerald-400",
UI_THEME_WARNING: "amber-400",
UI_THEME_DANGER: "red-400",

// Particle Speeds (pixels per second)
SPEED_LEGITIMATE: 150,
SPEED_MALICIOUS: 200,

// Collision Threshold
BANDWIDTH_COLLISION_THRESHOLD: 95,

// Performance / Visual caps
MAX_ACTIVE_PARTICLES: 1500,
VISUAL_SPAWN_CAP_PER_SECOND: 300,

// Colours
COLOR_LEGITIMATE: "#22C55E",
COLOR_UDP: "#EF4444",
COLOR_ICMP: "#F97316",
COLOR_TCP_SYN: "#EF4444",
COLOR_FORWARDED: "#22D3EE", // cyan (Tailwind cyan-400): packets forwarded proxy → origin
COLOR_BLOCKED: "#6B7280",
COLOR_TIMEOUT: "#000000",
```

### **3.1 Packet.js**

Represents a single unit of traffic.

* **Properties:**  
  * x, y: Float (Canvas coordinates).  
  * speed: Float (Based on bandwidth settings).  
  * type: Enum (TCP\_SYN, UDP, ICMP, HTTP\_GET).  
  * isMalicious: Boolean.  
  * sourceIP: String (e.g., "192.168.1.50").
  * destinationIP: String (the IP this packet is targeting; compare to Victim Public IP).
  * clientIP: String (optional; original source IP when traffic is proxied and client IP is preserved).
  * payloadSize: Integer.

### **3.2 Attacker.js**

Controls the generation of malicious packets.

* **State:** deviceCount, attackType, targetIP, botnetRanges (Array of /24 subnets), bandwidthMultiplier, isAttacking.  
* **Method generateBotnetRanges():** Creates 1 random /24 subnet per 20 devices. Avoids 172.16.0.x (genuine user range).  
* **Method spawnPacket():** Returns a new Packet instance with a random IP from one of the botnet ranges.  
* **Logic:** Uses a timer accumulator to spawn packets at rate: `deviceCount × baseRate × bandwidthMultiplier`.

**Clarification (v1 performance):** The calculated malicious rate can exceed what is practical to render. Use a visual cap and a weight:

* Compute `desiredPps = deviceCount × baseRate × bandwidthMultiplier`.
* Compute `visualPps = min(desiredPps, VISUAL_SPAWN_CAP_PER_SECOND)`.
* Each spawned malicious packet carries `trafficWeight = (desiredPps / visualPps) × PACKET_VISUAL_SCALE` (≥ 1) so that one rendered particle still accounts for multiple underlying packets.
* The server load calculations use `trafficWeight` so that simulation behaviour remains consistent even when not all traffic is rendered.

### **3.3 GenuineTraffic.js**

Controls the generation of legitimate user packets.

* **State:** userCount (fixed at 50), userIPs (Array: 172.16.0.1 - 172.16.0.50).  
* **Method spawnPacket():** Returns a new HTTP_GET Packet from a random genuine user IP.  
* **Logic:** Spawns 50 packets/second total (1 per user per second), evenly distributed. Each legitimate Packet carries `trafficWeight = PACKET_VISUAL_SCALE` so happiness/bandwidth metrics use the same aggregation as the attacker side.

### **3.4 Server.js**

Simulates the victim machine.

* **State:**  
  * bandwidthUsage (0-100): Percentage of bandwidth consumed.  
  * cpuLoad (0-100): Percentage of CPU/RAM consumed.  
  * activeConnections (Array): Half-open connections from TCP SYN packets (max 100 before crash). Each connection expires after `SYN_CONNECTION_TTL_SECONDS`.  
  * happinessScore (0-100): User satisfaction.  
  * status: Enum (ONLINE, DEGRADED, CRASHED).  
  * droppedPackets: Counter for legitimate packets lost.  
* **Method receive(packet):**  
  * If Volume Attack (UDP/ICMP): Increases bandwidthUsage by `packetSize / maxBandwidth`.  
  * If Protocol Attack (TCP SYN): Adds to activeConnections, increases cpuLoad by 1% per connection.  
  * If HTTP_GET (legitimate): Logs success if load < 99%, otherwise logs TIMEOUT and increments droppedPackets.  
* **Method update(dt):**  
  * Decays bandwidthUsage by 10% per second (simulating packets being processed).  
  * Expires old SYN connections, then decays cpuLoad by 2% per second (slower, as SYN connections linger).  
  * Updates status based on max(bandwidthUsage, cpuLoad).  
  * Recalculates happinessScore: `100 - (droppedPackets × 2)`.  
* **Status Thresholds:**  
  * ONLINE: max load < 90%  
  * DEGRADED: max load ≥ 90% and < 99%  
  * CRASHED: max load ≥ 99% (temporarily stops processing). Auto-recovers once max load drops below 90%.
* **Aggregate accounting (v1.3):** All load, drop, and happiness calculations use weighted packet counts (`trafficWeight`), so one rendered particle representing many packets still impacts metrics proportionally.

**Clarification (v1 simplified load model):** Server load is intentionally approximate for pedagogy.

* Treat each arriving packet as contributing a small fixed amount of load, multiplied by `trafficWeight` (if present).
* Volume traffic increases **bandwidthUsage**; SYN traffic increases **cpuLoad** (and active connections).
* HTTP_GET packets do not meaningfully increase load; they either succeed or timeout based on current server status.

### **3.5 Firewall.js**

The mitigation engine.

* **State:**  
  * blockedIPs: Set of /24 subnets (e.g., "45.33.12").  
  * blockedProtocols: Set of Enum (TCP, UDP, ICMP).  
  * rateLimitEnabled: Boolean.  
  * rateLimitThreshold: Integer (requests/sec, default 20).  
  * rateLimitProtocols: Set of Enum (TCP, UDP, ICMP) OR the special value "ALL" (default: ALL).  
  * rateLimitCounters: Map of IP → {count, lastReset}.  
  * loadBalancingEnabled: Boolean.  
* **Method inspect(packet):**  
  * Checks protocol against blockedProtocols.  
  * Checks IP subnet against blockedIPs (extracts first 3 octets).
  * **Clarification (v1.2):** When Reverse Proxy is enabled and `clientIP` is present, IP-based blocking/rate limiting should use the **client IP** (end-user/bot) rather than the proxy egress IP. If `clientIP` is not present, IP-based controls act on the observed `sourceIP` (proxy), illustrating the loss of per-client visibility.
  * If rateLimitEnabled, checks if IP exceeds threshold (resets counter each second). Rate limiting is applied only if the packet protocol is within `rateLimitProtocols` (or `ALL`).  
  * Returns Object: `{allowed: Boolean, reason: String}`.  
  * Logs decisions to the Traffic Analyzer (see logging clarification below).  
* **Method getDetectedSubnets():** Returns list of all unique /24 subnets seen in traffic (for UI display).

**Clarifications (v1):**

* **Protocol mapping:** Blocking **TCP** blocks both **HTTP_GET** (legitimate web traffic) and **TCP SYN** (attack traffic).
* **Rate limit scope:** Rate limiting is only active when the Firewall dashboard is enabled/open in the UI, and can be configured to apply to **ALL** protocols or a selected subset (TCP/UDP/ICMP).
* **Traffic Analyzer logging:** To avoid UI lockups, the analyzer logs at most `UI_ANALYZER_LOG_MAX_PER_SECOND` entries per second. (Prefer logging BLOCKED/DROPPED events; sample ALLOWED events if there is remaining budget.)
* **Aggregate badges (v1.3):** Analyzer counters and any per-protocol tallies should use the same aggregate values shown in the attacker/legit badges (e.g., abbreviate 1,000 as 1k) so the numbers stay consistent across UI and metrics. Logs may append the packet visual scale prefix (e.g., “×100”) to reflect weighted entries.

## **4\. The Visualisation Engine (Canvas)**

We will use the **HTML5 Canvas API** for the middle panel to ensure 60FPS performance even when 1,000 packets are on screen.

### **Canvas Configuration**

* **Internal resolution:** 1000px width × 400px height (canvas drawing buffer).  
* **Responsive display:** The canvas element is displayed at `min(100%, 1000px)` width while preserving aspect ratio, so the three-column UI fits typical school desktop screens.  
* **Minimum viewport:** 1200px. If below this, allow horizontal scrolling rather than reflowing into mobile layouts.

### **Visual Elements**

**Aggregate badge alignment (v1.3):** All numeric displays (bandwidth/CPU %, dropped counts, analyzer rows, legend captions) must use the same aggregate values shown on the attacker/legit badges (with 1k-style abbreviation) so visuals and metrics stay in sync.

* **The "Pipe":** A rounded rectangle (800px × 80px) centered vertically, representing the bandwidth conduit.  
* **Pipe Saturation Effect:** As bandwidth usage increases, the pipe's background colour transitions from light grey (0%) to red (100%).  
* **Load Balancing Mode:** When enabled, render two parallel pipes (each 800px × 35px) with a 10px gap.
* **Node Layout (v1.3):** Render four static glyphs: **Attackers** (left cluster badge = device count), **Legit Users** (left cluster badge = 50), **Proxy** (center when enabled, badge = current Public IP), **Origin Server** (right, badge = status + IP). Connect them with lines that pulse/glow for allowed flow and dim when blocked. Keep nodes static; animate line intensity only.
* **Reverse Proxy Mode (v1.2 → v1.3):** When Reverse Proxy is enabled, show two hops (Internet → Proxy → Origin). The proxy glyph sits between the pipe segments and inherits the Public IP label. The origin segment only lights when traffic passes proxy checks.
* **Firewall Glyph (v1.3):** Draw a distinct shield icon at the active inspection point (near the proxy when enabled; near the server when disabled). Blocked packets disappear at this glyph, and blocked edges briefly pulse red to make drops visually clear.

### **Particle Rendering**

Each packet type has distinct visual representation for accessibility:

| Type | Shape | Colour | Size |
|------|-------|--------|------|
| HTTP_GET (Legitimate) | Circle (●) | Green (#22C55E) | 8px radius |
| UDP Flood | Square (■) | Red (#EF4444) | 12px side |
| ICMP Flood | Square (■) | Orange (#F97316) | 12px side |
| TCP SYN | Triangle (▲) | Red (#EF4444) | 12px base |
| Half-Open Connection | Lock icon (🔒) | Red (#EF4444) | 16px |

**Reverse Proxy forwarding visual rule (v1.2):** When a packet is forwarded from proxy → origin, it keeps its **shape** but is recoloured **cyan** (#22D3EE) while traversing the origin segment. This differentiates "public" traffic from "forwarded" traffic.

**Packet visual scale (v1.3):** Display the current multiplier in the legend and tooltips (e.g., "UDP Flood Packet ■ ×100"). Each rendered particle represents `PACKET_VISUAL_SCALE` real packets; counters, logs, and badges use this aggregate value so visuals and metrics stay aligned.

### **Animation Loop**

1. **Clear** canvas with background colour.  
2. **Update** all packet positions: `x += speed × dt` (speed: 150px/sec for legitimate, 200px/sec for malicious).  
3. **Collision Detection:**
   * **Inspection point:**
     * If Reverse Proxy is **disabled**: inspection occurs at `pipeEndX` (just before the server).
     * If Reverse Proxy is **enabled**: inspection occurs at `proxyX` (just before the proxy node).
   * **At the inspection point:**
     * Trigger `Firewall.inspect(packet)`.
     * If not allowed: the packet turns **grey** and quickly disappears at the inspection point, fading at the **Firewall** shield glyph and briefly pulsing the adjacent line red.
     * If allowed and Reverse Proxy is enabled:
       * Mark the packet as **forwarded** (set `clientIP` to the original sender if not already present).
       * Set `sourceIP` to a proxy egress IP (from `PROXY_EGRESS_IP_PREFIX`) to simulate what the origin observes.
       * Recolour the packet to **cyan** while it travels proxy → origin.
   * **At the server:**
     * If Reverse Proxy is enabled and Origin Shielding is enabled, the server only accepts packets arriving from the proxy egress network.
     * Allowed packets reaching the server trigger `Server.receive()`.
   * If bandwidth > 95%: Legitimate packets are dropped due to congestion (simplified). They turn **black** (timeout) and quickly disappear.
4. **Draw** all active packets using appropriate shapes.  
5. **Draw** the particle legend below the canvas, including the packet visual scale (×N) label.

**Firewall block visual rule (v1):** If Firewall.inspect() returns not allowed, the packet turns **grey** and quickly disappears without reaching Server.receive().
**Clarification (v1.2):** When Reverse Proxy is enabled, this grey "blocked" disappearance occurs at the **proxy node** (edge), not at the server.

### **Server Visual Feedback**

* **Normal:** Server icon (right side) displayed in green.  
* **Degraded (≥90%):** Server icon turns amber, subtle pulse animation.  
* **Crashed (≥99%):** Server icon turns red, "shaking" CSS animation (translateX oscillation).

## **5\. User Interface (DOM)**

The UI needs to be clear for 14-year-old students, consistent, and "tactile" (obvious cause-and-effect).

### **Layout & Visual Design Rules**

* **Overall layout:**
  * A top control bar, then a 3-column grid below.
  * Left panel = Attacker controls, Middle = Canvas + Legend, Right panel = Victim + Firewall.
* **Sizing:**
  * Target desktop layout is designed for 1366px+ wide screens.
  * Panels should **shrink** responsively down to minimum widths before horizontal scrolling is introduced:
    * Left panel: 320px target, 260px minimum.
    * Right panel: 380px target, 320px minimum.
    * Middle panel: must remain at least 520px wide for the canvas + legend to be usable.
  * If the viewport is below 1200px or the middle panel would be < 520px, allow horizontal scrolling (do not switch to a mobile layout).
* **Spacing:** Use consistent padding (16px) and gaps (16px) between panels.
* **Typography:** Use Tailwind defaults (no custom font sizes). Use semantic headings (`text-lg`/`text-xl`) sparingly for section titles; body text remains default (`text-base`).
* **Theme surface ("hacker" feel, Tailwind defaults only):**
  * Use a **dark UI**: background `slate-950`, panels `slate-900`, borders `slate-700`.
  * Use **emerald** accents for interactive highlights (buttons, focus rings) and monospace logs.
  * Do not invent custom colours; use Tailwind’s built-in palette (slate/emerald/amber/red).
* **Card styling:** Panels are card-like sections with rounded corners (12px), subtle border, and dark surface backgrounds.
* **Accessibility:** Do not rely on colour alone; every status/traffic type uses text + shape + colour.

### **Component Styling Requirements (Tailwind Utilities)**

The implementation should use Tailwind utility classes to achieve the following component behaviours:

* **Buttons:**
  * Primary (Start Simulation / Start Attack): clear filled style.
  * Secondary (Stop / Reset): outlined or neutral filled style.
  * Disabled state: visibly muted and non-clickable.
  * Focus: obvious focus ring (Tailwind `focus:ring-*`) for keyboard accessibility.
* **Sliders:** Large, easy-to-grab handles, with the current numeric value always visible next to the slider.
* **Status badges:** Online / Degraded / Crashed displayed as a pill badge with colour + label.
* **Health bars:**
  * 2 bars (Bandwidth, CPU/RAM).
  * Animated width updates (CSS transition ~150ms) so changes are obvious but not distracting.
* **Logs:**
  * Monospace font for analyzer output (`font-mono`).
  * Limit entries to the last 50.
  * Each entry includes: time (optional), IP, protocol, action (Allowed/Blocked), reason.
* **Warnings:**
  * Blocking TCP shows an inline warning text (e.g., "Blocks all web users") and/or warning icon.

### **Global Control Bar**

A horizontal bar at the top with simulation controls:

* **Start Simulation** (▶): Begins simulation with legitimate traffic only.  
* **Stop Simulation** (⏸): Pauses all activity.  
* **Start Attack** (⚔): Activates attacker (only enabled when simulation is running).  
* **Stop Attack** (🛑): Stops new malicious packets.  
* **Reset** (↺): Returns to initial state.  

**Clarification (v1):** No timer display.

### **Middle Panel (Canvas + Legend)**

* The canvas is centered within the middle panel.
* The legend is always visible directly below the canvas.
* The middle panel also shows brief labels: "Network" and current congestion (e.g., "Bandwidth: 72%"), so students can connect visuals to metrics. Cluster badges for **Attackers** and **Legit Users** mirror the counts shown in the Attacker/Server panels and are used for all aggregate metrics.

### **Attacker Panel (Left)**

* **Input:** Range Sliders for Device Count (1-1000) and Attack Bandwidth (0.5x-2x).  
* **Dropdown:** Attack Type selector (UDP Flood, TCP SYN Flood, ICMP Flood).  
* **Display:** Botnet IP ranges (read-only list showing generated subnets).  
* **Feedback:** Dynamic text updating immediately (onInput event). Device count badge (uses 1k-style abbreviation) mirrors the value on the canvas cluster and feeds into aggregate metrics/logs.

### **Victim Panel (Right)**

* **Addressing (v1.2):**
  * Always display the server **Origin IP**.
  * When Reverse Proxy is enabled, also display the **Public IP** (proxy front-door IP) with a clear label (e.g., "Public IP (via Proxy)").
* **Health Bars:** CSS width transition for smooth 60fps updates. Two bars: Bandwidth and CPU/RAM.  
* **Status Indicator:** Large icon that changes colour (green/amber/red) based on server status.  
* **Happiness Score:** Prominent percentage display with colour coding (green ≥80%, amber 50-79%, red <50%).  
* **User/Device badges (v1.3):** Show a fixed **Legit Users: 50** badge and the current malicious device badge; these same aggregates appear in the canvas clusters, analyzer, and metric calculations to keep numbers consistent.
* **Log Window:** A `<div>` with `overflow-y: scroll`. Use prepend() for new log entries, limiting DOM nodes to the last 50 entries to prevent memory leaks. Shows "User X... SUCCESS/TIMEOUT".

### **Firewall Dashboard (Top Row, 4-Card Grid)**

* **Layout:** Four horizontal cards pinned at the top of the page: **Block Protocols**, **Rate Limiting / Infrastructure**, **Detected Subnets**, **Traffic Analyzer**. No collapsible section; all controls are always visible.
* **Traffic Analyzer:** Scrolling log of recent packets with IP, Protocol, and Status (Allowed/Blocked).  
* **Protocol Filters:** Three checkboxes (Block TCP, Block UDP, Block ICMP) with warning icon next to "Block TCP".  
* **IP Blocklist:** Dynamic list of detected /24 subnets with toggle switches. Subnets appear as they're detected in traffic.  
* **Rate Limiting:** Toggle switch + slider (5-50 req/sec).  
  * **Apply To:** Selector for which protocols are rate-limited (default: ALL). Keep this simple (e.g., a small set of checkboxes or a dropdown).
* **Load Balancing:** Toggle switch.

## **6\. Implementation Strategy**

### **Phase 1: The Core (Skeleton)**

* Setup index.html with the 3-column CSS Grid and global control bar.  
* Create GameLoop and CanvasRenderer to get moving dots.  
* Implement basic Packet class and render green circles moving across the pipe.

### **Phase 2: The Traffic Generation**

* Implement GenuineTraffic model (50 users, 1 packet/sec each).  
* Implement Attacker model with device count, attack type, and bandwidth multiplier.  
* Implement botnet IP range generation (1 subnet per 20 devices).  
* Connect UI sliders to the Attacker model.

### **Phase 3: The Server Logic**

* Implement Server model with bandwidth/CPU tracking.  
* Implement receive() method for different packet types.  
* Implement status thresholds (Online/Degraded/Crashed).  
* Implement happiness score calculation.  
* Add visual feedback (colour changes, shaking animation).

### **Phase 4: The Mitigation**

* Build the Firewall class with protocol and IP blocking.  
* Implement rate limiting with per-IP counters.  
* Implement load balancing (double bandwidth capacity, dual pipe visual).  
* Build the Traffic Analyzer log UI.  
* Add the logic for "False Positives" (blocking genuine 172.16.0.x packets).

### **Phase 5: Win/Lose Conditions**

Removed for v1: there is no win/lose condition or timer. Reset remains.

### **Phase 6: Visual Polish**

* Add particle legend below canvas.  
* Add distinct shapes for different packet types.  
* Add pipe saturation colour effect.  
* Add server shaking animation when load > 90%.

## **7\. Technical Constraints & Browser Support**

* **Dependencies policy:**  
  * No runtime JS frameworks (no React/Vue/etc).  
  * One build-time dependency is allowed: Tailwind CSS CLI for generating `css/main.css`.
* **Browser:** Chrome 80+, Firefox 75+, Edge (Chromium).  
* **Performance Target:** Maintain 60 FPS with 1,500 active particles.