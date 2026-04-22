# 🚀 EldReach — Real-Time IoT Monitoring System

EldReach is a **production-oriented IoT backend system** designed to monitor human activity across multiple rooms using radar-based sensor nodes. It processes real-time data, maintains device state, detects events, and streams updates to a live dashboard.

---

# 🧠 Architecture Overview

EldReach follows a **gateway–node architecture**:

```text
Sensor Nodes → Gateway → Backend → Database → Frontend
```

### 🔹 Key Concept

* **Sensor Node = Device = Room**
* Each node represents one physical room and sends processed sensor data.
* The **gateway** is only responsible for communication (not treated as a device).

---

# ⚙️ Tech Stack

* **Backend:** Node.js + Express
* **Database:** MongoDB (Atlas)
* **Real-time:** Socket.IO
* **Messaging (future):** MQTT
* **Frontend:** React (Antigravity)

---

# 📦 Project Structure

```text
src/
├── config/        # Database configuration
├── controllers/   # API request handlers
├── models/        # MongoDB schemas
├── services/      # Core business logic
├── routes/        # API routes
├── mqtt/          # MQTT integration (optional)
├── socket/        # Real-time communication
└── server.js      # Application entry point
```

---

# 🧩 Data Model

Each **device document represents one sensor node** (one room).

```json
{
  "deviceId": "node_1",
  "gatewayId": "192.168.1.10",
  "roomId": "room_1",

  "status": "active",
  "lastSeen": "2026-04-22T10:00:00Z",

  "sensors": {
    "radar": {
      "targets": [
        {
          "x": 1.2,
          "y": 2.3,
          "velocity": 0.5,
          "distance": 2.8
        }
      ]
    },
    "presence": {
      "motionDetected": true,
      "breathingDetected": true
    }
  },

  "processed": {
    "filteredTargets": [],
    "movementPath": [],
    "fallDetected": false
  }
}
```

---

# 🔄 Data Flow

1. Sensor node captures data (radar + presence)
2. Gateway forwards data (MQTT or API simulation)
3. Backend receives data
4. `deviceService` updates or creates device
5. Data stored in MongoDB (latest state)
6. Processing & alert logic executed
7. Socket.IO emits updates to frontend

---

# 🔥 Core Features

* ✅ Real-time device monitoring
* ✅ Multi-room support via node-based design
* ✅ Radar-based X/Y position tracking
* ✅ Presence detection (motion & breathing)
* ✅ Event-driven backend architecture
* ✅ Scalable and modular design

---

# 🧪 Testing Without Hardware

EldReach supports **full simulation without physical sensors**.

### ▶ Run simulator

```bash
node simulator.js
```

This generates dynamic sensor data and mimics real device behavior.

---

# 🛰️ MQTT Integration (Optional)

### Topic Structure

```text
eldreach/{gatewayId}/{nodeId}/data
```

### Example

```text
eldreach/192.168.1.10/node_1/data
```

Backend subscribes using:

```text
eldreach/+/+/data
```

---

# 📊 Database Collections

* **devices** → Current state of each node
* **devicelogs** → Historical sensor data
* **alerts** → Detected events (inactivity, fall)
* **rooms** → Spatial mapping and layout

---

# 🧠 Design Principles

* Event-driven architecture
* Separation of concerns (MVC + Services)
* One device = one document (no duplication)
* Snapshot-based state storage
* UTC time storage with frontend conversion
* Scalable gateway–node design

---

# ⚠️ Important Notes

* MongoDB stores timestamps in **UTC**
* Convert to local time (IST / Sri Lanka) in frontend
* Do not store historical data in `devices` collection
* Always update device state instead of inserting duplicates

---

# 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

---

### 2. Configure environment

```env
MONGO_URI=your_mongodb_connection
PORT=5000
ENABLE_MQTT=false
```

---

### 3. Start backend

```bash
npm run dev
```

---

### 4. Run simulator

```bash
node simulator.js
```

---

# 🔮 Future Enhancements

* Advanced fall detection algorithms
* Spatial filtering & room boundary mapping
* Movement path visualization
* Multi-user dashboards
* Gateway-level preprocessing

---

# 👨‍💻 Project Context

EldReach is built as a **real-world IoT system**, designed to integrate with actual hardware (ESP32-based nodes and gateway), with a focus on scalability, real-time processing, and reliability.

---

# 🏁 Summary

EldReach is not a simple CRUD backend — it is a **real-time, event-driven IoT processing system** designed to handle continuous sensor data, transform it into meaningful insights, and deliver live updates to users.

---
