# EldReach Backend Services

Welcome to the EldReach Backend repository. This backend acts as the central intelligence hub, bridging the gap between the physical IoT hardware (Gateway & Sensors), the MongoDB database, and the Frontend React Application.

This documentation is written specifically to help **IoT Engineers** and **Hardware Developers** understand how to communicate with the EldReach ecosystem securely and reliably.

---

## 🏗️ Architecture Overview

The backend is a multi-protocol Node.js application running 3 distinct communication channels simultaneously:

1. **HTTP / REST API (Port 5000)**
   - Serves standard API requests for the Frontend (e.g., retrieving room data, deleting devices).
   - Hosts the **Socket.IO** server which pushes real-time telemetry and status updates down to the React frontend.
2. **WebSocket Server (Port 5001) - *The Command Plane***
   - A dedicated, secure WebSocket server exclusively for the **Central Hub (Gateway)**.
   - Handles gateway registration, heartbeat monitoring, and bi-directional command execution (e.g., the backend commanding the gateway to verify a sensor MAC address).
3. **MQTT Broker (Port 1883) - *The Telemetry Plane***
   - An embedded Aedes MQTT broker.
   - Handles high-frequency sensor telemetry (presence, breathing rate) and status updates.

---

## 🔒 Security & Authentication

EldReach does not use user accounts or JWTs. Instead, it relies on strict hardware authentication.

### 1. Gateway WebSocket Authentication
When the Gateway connects to `ws://<server-ip>:5001`, it must authenticate via the query string:
`ws://<server-ip>:5001?token=eldreach-gw-secret-2026`

**HMAC Payload Signing:**
To prevent payload tampering and replay attacks, *every JSON message* sent from the Gateway over the WebSocket must include a `timestamp` and a cryptographic `signature`.
* **Hash Algorithm:** HMAC-SHA256
* **Secret:** `HMAC_SECRET` from `.env`
* **Process:** Remove the `signature` key, sort the JSON keys alphabetically, stringify, hash it, and append the `signature` before sending. Messages older than 5 minutes will be rejected.

### 2. MQTT Broker Authentication
The Gateway/Sensors must authenticate with the MQTT broker using the credentials defined in `.env` (`MQTT_USERNAME` and `MQTT_PASSWORD`).
* **Topic Restriction:** The broker only accepts publishes and subscriptions to the `eldreach/#` topic hierarchy.

---

## 🔌 Communication Flows

### A. Connecting a Gateway
1. Gateway connects to `ws://<server-ip>:5001?token=<GATEWAY_AUTH_TOKEN>`.
2. Gateway sends a `REGISTER_GATEWAY` payload (signed via HMAC).
3. Backend registers the gateway in MongoDB and responds with `REGISTRATION_ACK`.
4. Gateway begins sending a `HEARTBEAT` message every 30-60 seconds to maintain the "ONLINE" status.

### B. Adding a New Sensor
1. User enters a Sensor MAC Address in the Frontend.
2. Frontend hits `POST /api/devices/register`.
3. Backend registers the device in MongoDB with status `REGISTERED`.
4. Backend sends a `VERIFY_SENSOR` command over WebSocket to the Gateway.
5. Gateway checks its internal hardware registry for the MAC.
6. Gateway replies with `SENSOR_VERIFIED` (status `ACTIVE` or `NOT_FOUND`).
7. Backend updates MongoDB and emits a Socket.IO event so the Frontend UI updates instantly.

### C. Streaming Telemetry (MQTT)
1. Gateway (or Sensors) publish presence/vital data to the MQTT broker.
2. **Topic:** `eldreach/sensors/<MAC_ADDRESS>/telemetry`
3. **Payload:** `{"macAddress": "AA:BB:CC:11:22:33", "presence": true, "breathingRate": 16, "timestamp": 1684321234}`
4. Backend intercepts the MQTT publish, logs the data to the `DeviceLog` MongoDB collection, updates the `Device` last seen time, and broadcasts the live data to the Frontend via Socket.IO.

---

## ⚙️ Environment Setup (.env)

Create a `.env` file in the root of the Backend directory. Here is the configuration needed to run the server:

```env
# ── Core Server Config ──
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.../?appName=Cluster0

# ── MQTT Broker Config (Port 1883) ──
ENABLE_MQTT=true
MQTT_PORT=1883
MQTT_USERNAME=eldreach_node
MQTT_PASSWORD=mqtt_1234

# ── Gateway WebSocket Config (Port 5001) ──
GATEWAY_WS_PORT=5001
GATEWAY_AUTH_TOKEN=eldreach-gw-secret-2026
GATEWAY_HEARTBEAT_TIMEOUT=60000     # 60s before gateway marked OFFLINE
GATEWAY_COMMAND_TIMEOUT=10000       # 10s timeout for VERIFY_SENSOR commands
HMAC_SECRET=eldreach_hmac_secret_key_98765 # Used by Gateway to sign WS payloads
```

---

## 🚀 Running the Project

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start Development Server (with auto-reload):**
   ```bash
   npm run dev
   ```

3. **Start Production Server:**
   ```bash
   npm start
   ```

### 📋 Troubleshooting / Logs
* The backend strictly uses **Zod** for payload validation. If your requests are failing, check the terminal for `VALIDATION_ERROR` logs.
* Security events (like invalid HMAC signatures, rejected WS connections, or failed MQTT logins) are written to `Backend/logs/security.log`.
