# 🚀 EldReach — Real-Time IoT Monitoring System

EldReach is a **production-oriented IoT backend system** designed to monitor human activity across multiple rooms using radar-based sensor nodes. It processes real-time data, maintains device state, detects events, and streams updates to a live dashboard.

---

# 🧠 Architecture Overview

EldReach follows a **Gateway-WebSocket architecture**:

```text
Sensor Nodes → Central Hub (Gateway) → (WebSocket) → Backend → Database → Frontend
```

### 🔹 Key Concept

* **Sensor Node = Device = Room**
* Each node represents one physical room and sends processed sensor data.
* The **Gateway** is the central hub in the home that aggregates data from sensors and maintains a persistent, bidirectional WebSocket connection with the backend.

---

# 🔌 How to Connect the System

The architecture relies on a strict flow for connecting the Gateway to the Backend, and then verifying Sensor Nodes through the Gateway.

## 1. Connecting the Gateway (Central Hub)

The backend exposes a dedicated raw WebSocket server on port `5001` exclusively for Gateway communication. 

**Firmware Flow:**
1. The Gateway connects to the backend: 
   `ws://<backend-ip>:5001?token=eldreach-gw-secret-2026`
2. Immediately upon connecting, the Gateway must register itself:
   ```json
   {
     "type": "REGISTER_GATEWAY",
     "gatewayId": "GW-MAC-ADDRESS",
     "systemId": "HOME001"
   }
   ```
3. The Gateway must send a heartbeat every 30 seconds to keep the connection alive:
   ```json
   {
     "type": "HEARTBEAT",
     "gatewayId": "GW-MAC-ADDRESS"
   }
   ```
*(If the backend misses heartbeats for 60 seconds, the Gateway is marked offline).*

## 2. Connecting Sensor Nodes (Device Registration)

Sensors are linked to the system via the Web Application.

**Workflow:**
1. The user clicks "Add Device" in the web app and enters the Sensor's MAC Address.
2. The Frontend sends a request to the Backend.
3. The Backend creates a `REGISTERED` record in the database.
4. The Backend instantly sends a `VERIFY_SENSOR` command over the WebSocket to the Gateway:
   ```json
   {
     "type": "VERIFY_SENSOR",
     "macAddress": "AA:BB:CC:DD:EE:FF",
     "requestId": "550e8400-e29b-41d4-a716-446655440000"
   }
   ```
5. The Gateway checks its local physical network to confirm the sensor exists, and replies:
   ```json
   {
     "type": "SENSOR_VERIFIED",
     "requestId": "550e8400-e29b-41d4-a716-446655440000",
     "macAddress": "AA:BB:CC:DD:EE:FF",
     "active": true
   }
   ```
6. The Backend updates the database status to `ACTIVE` and alerts the frontend via Socket.IO.

---

# ⚙️ Tech Stack

* **Backend:** Node.js + Express
* **Database:** MongoDB (Atlas)
* **Real-time Frontend:** Socket.IO (Port 5000)
* **Real-time Gateway:** Native `ws` WebSocket (Port 5001)
* **Frontend:** React (Vite + Zustand)

---

# 📦 Project Structure

```text
Backend/src/
├── config/             # Database configuration
├── controllers/        # REST API request handlers
├── models/             # MongoDB schemas (Device, Gateway, Alert)
├── services/           
│   ├── gatewayManager.js     # Manages active WS connections & timeouts
│   ├── gatewayWebSocket.js   # Raw WS server on port 5001
│   ├── socketService.js      # Socket.IO server on port 5000
│   └── deviceService.js      # Database operations for devices
├── routes/             # Express API routes
└── server.js           # Application entry point
```

---

# 🧩 Data Model

### Device (Sensor Node)
```json
{
  "deviceId": "AA:BB:CC:DD:EE:FF",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "gatewayId": "GW-MAC-ADDRESS",
  "status": "ACTIVE",  // REGISTERED, VERIFYING, ACTIVE, NO_HUB, DISCONNECTED
  "lastSeen": "2026-06-06T10:00:00Z",
  "sensors": { ... }
}
```

### Gateway
```json
{
  "gatewayId": "GW-MAC-ADDRESS",
  "systemId": "HOME001",
  "status": "ONLINE", // ONLINE, OFFLINE
  "connectedAt": "2026-06-06T09:00:00Z",
  "lastSeen": "2026-06-06T10:00:30Z"
}
```

---

# 🚀 Getting Started

### 1. Install dependencies

```bash
cd Backend
npm install
```

### 2. Configure environment

Create a `.env` file in the `Backend` directory:
```env
MONGO_URI=your_mongodb_connection
PORT=5000
GATEWAY_WS_PORT=5001
GATEWAY_AUTH_TOKEN=eldreach-gw-secret-2026
GATEWAY_HEARTBEAT_TIMEOUT=60000
GATEWAY_COMMAND_TIMEOUT=15000
```

### 3. Start backend

```bash
npm run dev
```

### 4. Simulating the Gateway

You can test the flow without physical hardware using `wscat`:

```bash
# 1. Connect
wscat -c "ws://localhost:5001?token=eldreach-gw-secret-2026"

# 2. Register
{"type":"REGISTER_GATEWAY","gatewayId":"GW001","systemId":"HOME001"}

# 3. Simulate Sensor Verification Response (after adding via frontend)
{"type":"SENSOR_VERIFIED","requestId":"<paste-uuid-from-server>","macAddress":"AA:BB:CC:DD:EE:FF","active":true}
```

---

# 🧠 Design Principles

* **Dual Real-time Layers:** Separated `Socket.IO` (UI updates) and native `ws` (hardware efficiency).
* **Single Source of Truth:** Gateway connection states live in RAM (`GatewayManager`) backed up to MongoDB for consistency.
* **Strict State Machines:** Devices must be verified through the gateway before becoming ACTIVE.
* **Event-driven:** No polling; all status changes propagate instantly to the frontend.
