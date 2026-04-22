/**
 * useStore.js — EldReach central state
 *
 * ── State shape ──────────────────────────────────────────────
 *
 * Rooms (logicalRooms):
 *   { id, name, bounds: {x, y, width, height}, itemIds: string[] }
 *
 * Sensor Nodes (sensors):
 *   { id, assignedDeviceId: string|null, logicalRoomId: string|null,
 *     status: 'UNBOUND'|'CONNECTED'|'INACTIVE'|'ALERT'|'DISCONNECTED',
 *     x, y, createdAt }
 *
 * Devices (discoveredDevices):
 *   { id, deviceId, connectionStatus, assignedRoomId, assignedNodeId, scannedAt }
 *
 * Gateway (canvas):
 *   { x, y } | null
 *
 * ── Node status ──────────────────────────────────────────────
 *   UNBOUND      — placed on canvas, no device assigned yet (grey)
 *   CONNECTED    — device active, motion recent (green)
 *   INACTIVE     — device on, no motion for 8–15 s (amber)
 *   ALERT        — no motion > 15 s (red)
 *   DISCONNECTED — device lost connection (grey)
 *
 * ── Data flow ──────────────────────────────────────────────
 *   Hardware → deviceService → store actions → React components
 *   Simulation → tickSimulation() → store state → React components
 */

import { create } from 'zustand';
import { getDevices } from '../services/deviceService';

// ─── Persistence ──────────────────────────────────────────────────────────────

const PERSIST_KEY = 'eldreach_v3'; // bumped version to clear stale v2 shape

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function persistState(state) {
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({
      rooms:             state.rooms,
      furnitures:        state.furnitures,
      doorways:          state.doorways,
      logicalRooms:      state.logicalRooms,
      sensors:           state.sensors,
      gatewayNode:       state.gatewayNode,
      discoveredDevices: state.discoveredDevices,
      monitoringState:   state.monitoringState,
      globalGatewayId:   state.globalGatewayId,
      settings:          state.settings,
    }));
  } catch { /* quota / private-mode — ignore */ }
}

// ─── Migration / defaults ─────────────────────────────────────────────────────

/** Ensure any persisted sensor has the new fields (backward compat). */
function migrateSensor(s) {
  return {
    assignedDeviceId: s.deviceId ?? s.assignedDeviceId ?? null,
    logicalRoomId:    s.logicalRoomId ?? null,
    status:           s.assignedDeviceId ? 'CONNECTED' : 'UNBOUND',
    createdAt:        s.createdAt ?? Date.now(),
    ...s,
  };
}

/** Ensure any persisted discovered device has assignedNodeId. */
function migrateDevice(d) {
  return { assignedNodeId: d.assignedNodeId ?? null, ...d };
}

const persisted = loadPersistedState();

// ─── Store ────────────────────────────────────────────────────────────────────

const useStore = create((set, get) => ({

  // ── History ────────────────────────────────────────────────────────────────
  past:   [],
  future: [],

  saveToHistory() {
    const s = get();
    const snap = _snapshot(s);
    const newPast = [...s.past, snap];
    if (newPast.length > 20) newPast.shift();
    set({ past: newPast, future: [] });
  },

  undo() {
    const s = get();
    if (!s.past.length) return;
    const newPast = [...s.past];
    const prev = newPast.pop();
    set({ past: newPast, future: [_snapshot(s), ...s.future], ...prev, selectedIds: [] });
    persistState({ ...get() });
  },

  redo() {
    const s = get();
    if (!s.future.length) return;
    const [next, ...rest] = s.future;
    set({ past: [...s.past, _snapshot(s)], future: rest, ...next, selectedIds: [] });
    persistState({ ...get() });
  },

  // ── Layout ─────────────────────────────────────────────────────────────────
  rooms:        persisted.rooms        ?? [],
  furnitures:   persisted.furnitures   ?? [],
  doorways:     persisted.doorways     ?? [],

  /**
   * logicalRooms — named bounded spaces
   * Shape: { id, name, bounds: {x, y, width, height}, itemIds: string[] }
   */
  logicalRooms: persisted.logicalRooms ?? [],

  /**
   * sensors (sensor nodes) — visual canvas placeholders
   * Shape: { id, assignedDeviceId, logicalRoomId, status, x, y, createdAt }
   */
  sensors: (persisted.sensors ?? []).map(migrateSensor),

  /**
   * gatewayNode — canvas position of the gateway hub
   * Shape: { x, y } | null
   */
  gatewayNode: persisted.gatewayNode !== undefined
    ? persisted.gatewayNode
    : { x: typeof window !== 'undefined' ? window.innerWidth / 2 : 400, y: 50 },

  // ── Device pool ────────────────────────────────────────────────────────────
  /**
   * discoveredDevices — pool of detected devices (sim or real)
   * Shape: { id, deviceId, connectionStatus, assignedRoomId, assignedNodeId, scannedAt }
   */
  discoveredDevices: (persisted.discoveredDevices ?? []).map(migrateDevice),

  // ── Monitoring ─────────────────────────────────────────────────────────────
  /**
   * monitoringState — keyed by logicalRoomId, derived by tickSimulation
   * Shape: { [roomId]: { status, connectionStatus, deviceId, lastActive, lastSeen, logs[] } }
   */
  monitoringState: persisted.monitoringState ?? {},
  alerts:          [],
  gatewayStats:    { lastSyncTime: Date.now(), packetsReceived: 0 },

  // ── UI state ───────────────────────────────────────────────────────────────
  selectedIds:     [],
  lockedIds:       [],
  designerState:   'EDIT',
  globalGatewayId: persisted.globalGatewayId ?? 'GW-ELD-01',

  // ── Settings ───────────────────────────────────────────────────────────────
  settings: persisted.settings ?? {
    activitySensitivity: 'Medium',
    backupWifiSSID: '',
    backupWifiPassword: '',
    userName: 'Admin',
    userEmail: 'admin@eldreach.com',
    caregiverPhone: '',
    enableAlerts: true,
    enableSmsNotifications: false,
  },

  // ── Setters ────────────────────────────────────────────────────────────────
  setDesignerState(mode)  { set({ designerState: mode }); },
  setGlobalGatewayId(id)  { set({ globalGatewayId: id }); persistState({ ...get(), globalGatewayId: id }); },
  updateSettings(updates) {
    set(s => {
      const next = { settings: { ...s.settings, ...updates } };
      persistState({ ...s, ...next });
      return next;
    });
  },

  // ── Device pool ────────────────────────────────────────────────
  /**
   * refreshDevicePool — reload available devices.
   */
  refreshDevicePool: async () => {
    const s = get();
    const fresh = await getDevices();
    const assigned = s.discoveredDevices.filter(d => d.assignedNodeId !== null);
    
    const nextDevices = fresh.map(f => {
      const existing = s.discoveredDevices.find(d => d.deviceId === f.deviceId);
      if (existing && existing.assignedNodeId) {
        return { ...f, assignedNodeId: existing.assignedNodeId, assignedRoomId: existing.assignedRoomId };
      }
      return f;
    });
    
    // Add any assigned devices that didn't come in the fresh pool
    for (const a of assigned) {
      if (!nextDevices.find(d => d.deviceId === a.deviceId)) {
        nextDevices.push(a);
      }
    }
    
    const next = { discoveredDevices: nextDevices };
    set(next);
    persistState({ ...s, ...next });
    get().autoBindDevices();
  },

  updateDeviceInStore: (device) => {
    const s = get();
    const now = Date.now();
    let updatedDevices = [...s.discoveredDevices];
    let updatedSensors = [...s.sensors];
    let newMonitoring = { ...s.monitoringState };

    const existingDeviceIdx = updatedDevices.findIndex(d => d.deviceId === device.deviceId);

    let assignedNodeId = null;
    let assignedRoomId = null;

    if (existingDeviceIdx >= 0) {
      assignedNodeId = updatedDevices[existingDeviceIdx].assignedNodeId;
      assignedRoomId = updatedDevices[existingDeviceIdx].assignedRoomId;
      updatedDevices[existingDeviceIdx] = {
        ...updatedDevices[existingDeviceIdx],
        ...device,
        connectionStatus: device.status === 'active' ? 'CONNECTED' : 'DISCONNECTED',
      };
    } else {
      // New device! Add to pool
      const newDevice = {
        ...device,
        id: device._id || `disc-${now}-${Math.random()}`,
        connectionStatus: device.status === 'active' ? 'CONNECTED' : 'DISCONNECTED',
        assignedNodeId: null,
        assignedRoomId: null,
        scannedAt: now,
      };
      
      // Auto-bind logic for NEW device only
      const candidateNodes = updatedSensors
        .filter(n => n.status === 'UNBOUND')
        .sort((a, b) => a.createdAt - b.createdAt);
      
      if (candidateNodes.length > 0) {
        const targetNode = candidateNodes[0];
        assignedNodeId = targetNode.id;
        assignedRoomId = targetNode.logicalRoomId;
        newDevice.assignedNodeId = assignedNodeId;
        newDevice.assignedRoomId = assignedRoomId;

        updatedSensors = updatedSensors.map(n => 
          n.id === targetNode.id 
            ? { ...n, assignedDeviceId: device.deviceId, status: 'CONNECTED' } 
            : n
        );
      }
      updatedDevices.push(newDevice);
    }

    // Update monitoring state if assigned
    if (assignedRoomId && assignedNodeId) {
      const roomStatus = device.status === 'active' ? 'NORMAL' : 'INACTIVE';
      const logs = newMonitoring[assignedRoomId]?.logs || [];

      newMonitoring[assignedRoomId] = {
        ...(newMonitoring[assignedRoomId] || {}),
        status: roomStatus,
        connectionStatus: device.status === 'active' ? 'CONNECTED' : 'DISCONNECTED',
        deviceId: device.deviceId,
        lastActive: device.lastActive ? new Date(device.lastActive).getTime() : now,
        lastSeen: device.lastSeen ? new Date(device.lastSeen).getTime() : now,
        logs: logs,
        backendData: device // store raw backend data here for Canvas/UI
      };

      updatedSensors = updatedSensors.map(n => 
        n.id === assignedNodeId 
          ? { ...n, status: roomStatus === 'NORMAL' ? 'CONNECTED' : roomStatus }
          : n
      );
    }

    set({ discoveredDevices: updatedDevices, sensors: updatedSensors, monitoringState: newMonitoring });
  },

  addAlertToStore: (alert) => {
    set(s => ({
      alerts: [{
        id: alert._id || `alert-${Date.now()}`,
        message: alert.message,
        timestamp: new Date(alert.createdAt || Date.now()).getTime(),
        acknowledged: false,
        deviceId: alert.deviceId,
      }, ...s.alerts]
    }));
  },

  // ── Sensor node placement & binding ───────────────────────────────────────

  /**
   * addSensorNode — user-placed UNBOUND visual node.
   * No device required. Place first, auto-bind later.
   *
   * @param {string|null} logicalRoomId  Optional — auto-detected from position on drag
   * @param {number} x
   * @param {number} y
   */
  addSensorNode(logicalRoomId, x, y) {
    get().saveToHistory();
    const now = Date.now();
    // Detect room by position if not provided
    if (!logicalRoomId) {
      const lr = get().logicalRooms.find(r =>
        x >= r.bounds.x && x <= r.bounds.x + r.bounds.width &&
        y >= r.bounds.y && y <= r.bounds.y + r.bounds.height
      );
      logicalRoomId = lr?.id ?? null;
    }
    const newNode = {
      id:               `sen-${now}`,
      assignedDeviceId: null,
      logicalRoomId,
      status:           'UNBOUND',
      x,
      y,
      createdAt: now,
    };
    set(s => {
      const next = { sensors: [...s.sensors, newNode] };
      persistState({ ...s, ...next });
      return next;
    });
    // Attempt auto-binding immediately (in case a device is waiting)
    get().autoBindDevices();
  },

  /**
   * autoBindDevices — FIFO binding.
   * For each connected-but-unbound device, bind to the oldest UNBOUND node
   * in the same room first, then any room. Called after discovery & on each
   * real device-connect event.
   */
  autoBindDevices() {
    const s = get();
    const unboundDevices = s.discoveredDevices.filter(
      d => !d.assignedNodeId && d.connectionStatus === 'CONNECTED'
    );
    if (!unboundDevices.length) return;

    const now = Date.now();
    let updatedSensors = [...s.sensors];
    let updatedDevices = [...s.discoveredDevices];
    const newMonitoring = { ...s.monitoringState };
    let newAlerts = [...s.alerts];

    for (const device of unboundDevices) {
      // Prefer an unbound node in a room that matches device's preferred room (if set)
      const candidateNodes = updatedSensors
        .filter(n => n.status === 'UNBOUND')
        .sort((a, b) => a.createdAt - b.createdAt); // FIFO

      if (!candidateNodes.length) break; // no nodes available

      const targetNode = candidateNodes[0];

      // Update sensor node
      updatedSensors = updatedSensors.map(n =>
        n.id === targetNode.id
          ? { ...n, assignedDeviceId: device.deviceId, status: 'CONNECTED' }
          : n
      );

      // Update device record
      updatedDevices = updatedDevices.map(d =>
        d.id === device.id
          ? { ...d, assignedNodeId: targetNode.id, assignedRoomId: targetNode.logicalRoomId }
          : d
      );

      // Init monitoring state for the room
      if (targetNode.logicalRoomId) {
        newMonitoring[targetNode.logicalRoomId] = {
          ...(newMonitoring[targetNode.logicalRoomId] ?? {}),
          status:           'NORMAL',
          connectionStatus: 'CONNECTED',
          deviceId:         device.deviceId,
          lastActive:       now,
          lastSeen:         now,
          logs: [
            { time: now, msg: `Device ${device.deviceId} auto-bound to node ${targetNode.id}` },
            ...(newMonitoring[targetNode.logicalRoomId]?.logs ?? []),
          ].slice(0, 10),
        };
      }
    }

    const next = {
      sensors:           updatedSensors,
      discoveredDevices: updatedDevices,
      monitoringState:   newMonitoring,
      alerts:            newAlerts,
    };
    set(next);
    persistState({ ...s, ...next });
  },

  /**
   * bindDeviceToNode — manual override. User picks which node to bind.
   * @param {string} devicePoolId  discoveredDevices[].id
   * @param {string} nodeId        sensor node id
   */
  bindDeviceToNode(devicePoolId, nodeId) {
    const s = get();
    const device = s.discoveredDevices.find(d => d.id === devicePoolId);
    const node   = s.sensors.find(n => n.id === nodeId);
    if (!device || !node) return;

    get().saveToHistory();
    const now = Date.now();

    // Unbind device from previous node
    const prevNodeId = device.assignedNodeId;

    const updatedSensors = s.sensors.map(n => {
      if (n.id === nodeId) return { ...n, assignedDeviceId: device.deviceId, status: 'CONNECTED' };
      if (n.id === prevNodeId) return { ...n, assignedDeviceId: null, status: 'UNBOUND' };
      return n;
    });

    // Unbind any other device currently on this node
    const prevDeviceOnNode = s.discoveredDevices.find(d => d.assignedNodeId === nodeId && d.id !== devicePoolId);
    const updatedDevices = s.discoveredDevices.map(d => {
      if (d.id === devicePoolId)        return { ...d, assignedNodeId: nodeId, assignedRoomId: node.logicalRoomId };
      if (d.id === prevDeviceOnNode?.id) return { ...d, assignedNodeId: null, assignedRoomId: null };
      return d;
    });

    const newMonitoring = { ...s.monitoringState };
    if (node.logicalRoomId) {
      newMonitoring[node.logicalRoomId] = {
        ...(newMonitoring[node.logicalRoomId] ?? {}),
        status: 'NORMAL', connectionStatus: 'CONNECTED',
        deviceId: device.deviceId, lastActive: now, lastSeen: now,
        logs: [{ time: now, msg: `Device ${device.deviceId} manually bound` },
               ...(newMonitoring[node.logicalRoomId]?.logs ?? [])].slice(0, 10),
      };
    }

    const next = { sensors: updatedSensors, discoveredDevices: updatedDevices, monitoringState: newMonitoring };
    set(next);
    persistState({ ...s, ...next });
  },

  /**
   * unassignNode — remove device binding from a node. Node becomes UNBOUND again.
   * Device returns to unassigned pool.
   */
  unassignNode(nodeId) {
    const s = get();
    const node = s.sensors.find(n => n.id === nodeId);
    if (!node || !node.assignedDeviceId) return;

    get().saveToHistory();

    const updatedSensors = s.sensors.map(n =>
      n.id === nodeId ? { ...n, assignedDeviceId: null, status: 'UNBOUND' } : n
    );
    const updatedDevices = s.discoveredDevices.map(d =>
      d.assignedNodeId === nodeId ? { ...d, assignedNodeId: null, assignedRoomId: null } : d
    );

    // Clear monitoring for room if no other bound nodes in same room
    const newMonitoring = { ...s.monitoringState };
    if (node.logicalRoomId) {
      const otherBound = updatedSensors.some(
        n => n.logicalRoomId === node.logicalRoomId && n.assignedDeviceId
      );
      if (!otherBound) delete newMonitoring[node.logicalRoomId];
    }

    const next = { sensors: updatedSensors, discoveredDevices: updatedDevices, monitoringState: newMonitoring };
    set(next);
    persistState({ ...s, ...next });
  },

  // ── Sensor node drag/move ──────────────────────────────────────────────────
  updateSensorNode(id, updates) {
    get().saveToHistory();
    set(s => {
      const updated = s.sensors.map(n => n.id === id ? { ...n, ...updates } : n);
      // Re-bind to logical room by spatial overlap after drag
      const remapped = updated.map(n => {
        const room = s.logicalRooms.find(lr =>
          n.x >= lr.bounds.x && n.x <= lr.bounds.x + lr.bounds.width &&
          n.y >= lr.bounds.y && n.y <= lr.bounds.y + lr.bounds.height
        );
        return { ...n, logicalRoomId: room?.id ?? null };
      });
      const next = { sensors: remapped };
      persistState({ ...s, ...next });
      return next;
    });
  },

  // Keep `updateSensor` as alias for existing canvas code
  updateSensor(id, updates) { get().updateSensorNode(id, updates); },

  deleteSensor(id) {
    get().saveToHistory();
    const s = get();
    // Return device to unbound pool
    const updatedDevices = s.discoveredDevices.map(d =>
      d.assignedNodeId === id ? { ...d, assignedNodeId: null, assignedRoomId: null } : d
    );
    const next = {
      sensors:           s.sensors.filter(n => n.id !== id),
      discoveredDevices: updatedDevices,
    };
    set(next);
    persistState({ ...s, ...next });
  },

  // ── [REMOVED] assignDeviceToRoom ───────────────────────────────
  // Superseded by bindDeviceToNode() + autoBindDevices().
  // RoomDeviceAssignment.jsx calls bindDeviceToNode() directly.

  // ── Gateway node ───────────────────────────────────────────────────────────
  updateGatewayNode(updates) {
    if (get().lockedIds.includes('gateway-node-1')) return;
    get().saveToHistory();
    set(s => {
      const next = { gatewayNode: s.gatewayNode ? { ...s.gatewayNode, ...updates } : updates };
      persistState({ ...s, ...next });
      return next;
    });
  },

  // ── Logical rooms ──────────────────────────────────────────────────────────
  createLogicalRoom(name, bounds, itemIds) {
    get().saveToHistory();
    set(s => {
      const id = `lr-${Date.now()}`;
      const next = { logicalRooms: [...s.logicalRooms, { id, name, bounds, itemIds }] };
      persistState({ ...s, ...next });
      return next;
    });
  },

  updateLogicalRoom(id, updates) {
    get().saveToHistory();
    set(s => {
      const next = { logicalRooms: s.logicalRooms.map(r => r.id === id ? { ...r, ...updates } : r) };
      persistState({ ...s, ...next });
      return next;
    });
  },

  moveLogicalRoom(id, dx, dy) {
    get().saveToHistory();
    set(s => {
      const lr = s.logicalRooms.find(r => r.id === id);
      if (!lr) return s;
      const next = {
        logicalRooms: s.logicalRooms.map(r => r.id === id
          ? { ...r, bounds: { ...r.bounds, x: r.bounds.x + dx, y: r.bounds.y + dy } }
          : r),
        rooms:      s.rooms.map(i      => lr.itemIds.includes(i.id) ? { ...i, x: i.x + dx, y: i.y + dy } : i),
        furnitures: s.furnitures.map(i => lr.itemIds.includes(i.id) ? { ...i, x: i.x + dx, y: i.y + dy } : i),
        doorways:   s.doorways.map(i   => lr.itemIds.includes(i.id) ? { ...i, x: i.x + dx, y: i.y + dy } : i),
        sensors:    s.sensors.map(n    => n.logicalRoomId === id ? { ...n, x: n.x + dx, y: n.y + dy } : n),
      };
      persistState({ ...s, ...next });
      return next;
    });
  },

  // ── Raw canvas items ───────────────────────────────────────────────────────
  addRoom(room) {
    get().saveToHistory();
    set(s => {
      const id = `room-${Date.now()}`;
      const next = { rooms: [...s.rooms, { id, type: 'room', subRects: [], rotation: 0, ...room }], selectedIds: [id] };
      persistState({ ...s, ...next }); return next;
    });
  },
  updateRoom(id, attrs) {
    get().saveToHistory();
    set(s => { const next = { rooms: s.rooms.map(r => r.id === id ? { ...r, ...attrs } : r) }; persistState({ ...s, ...next }); return next; });
  },
  addFurniture(furniture) {
    get().saveToHistory();
    set(s => {
      const id = `furniture-${Date.now()}`;
      const next = { furnitures: [...s.furnitures, { id, type: 'furniture', rotation: 0, ...furniture }], selectedIds: [id] };
      persistState({ ...s, ...next }); return next;
    });
  },
  updateFurniture(id, attrs) {
    get().saveToHistory();
    set(s => { const next = { furnitures: s.furnitures.map(f => f.id === id ? { ...f, ...attrs } : f) }; persistState({ ...s, ...next }); return next; });
  },
  addDoorway(doorway) {
    get().saveToHistory();
    set(s => {
      const id = `doorway-${Date.now()}`;
      const next = { doorways: [...s.doorways, { id, type: 'doorway', rotation: 0, ...doorway }], selectedIds: [id] };
      persistState({ ...s, ...next }); return next;
    });
  },
  updateDoorway(id, attrs) {
    get().saveToHistory();
    set(s => { const next = { doorways: s.doorways.map(d => d.id === id ? { ...d, ...attrs } : d) }; persistState({ ...s, ...next }); return next; });
  },

  // ── Selection & manipulation ───────────────────────────────────────────────
  selectItem(id, multi = false) {
    set(s => {
      if (!id) return { selectedIds: [] };
      if (multi) {
        return s.selectedIds.includes(id)
          ? { selectedIds: s.selectedIds.filter(sid => sid !== id) }
          : { selectedIds: [...s.selectedIds, id] };
      }
      return { selectedIds: [id] };
    });
  },

  toggleLock(ids) {
    get().saveToHistory();
    set(s => {
      const locked = [...s.lockedIds];
      ids.forEach(id => { const i = locked.indexOf(id); i >= 0 ? locked.splice(i, 1) : locked.push(id); });
      return { lockedIds: locked };
    });
  },

  deleteItems(ids) {
    if (!ids?.length) return;
    get().saveToHistory();
    set(s => {
      const deletedLRIds = s.logicalRooms.filter(lr => ids.includes(lr.id)).map(lr => lr.id);
      // Return devices to pool for deleted rooms/nodes
      const updatedDevices = s.discoveredDevices.map(d => {
        const nodeDeleted = ids.includes(d.assignedNodeId);
        const roomDeleted = deletedLRIds.includes(d.assignedRoomId);
        return (nodeDeleted || roomDeleted) ? { ...d, assignedNodeId: null, assignedRoomId: null } : d;
      });
      const newMon = { ...s.monitoringState };
      deletedLRIds.forEach(id => delete newMon[id]);
      const next = {
        rooms:             s.rooms.filter(i      => !ids.includes(i.id)),
        furnitures:        s.furnitures.filter(i  => !ids.includes(i.id)),
        doorways:          s.doorways.filter(i    => !ids.includes(i.id)),
        logicalRooms:      s.logicalRooms.filter(r => !ids.includes(r.id)),
        sensors:           s.sensors.filter(n     => !ids.includes(n.id)),
        gatewayNode:       ids.includes('gateway-node-1') ? null : s.gatewayNode,
        selectedIds:       s.selectedIds.filter(id => !ids.includes(id)),
        lockedIds:         s.lockedIds.filter(id   => !ids.includes(id)),
        discoveredDevices: updatedDevices,
        monitoringState:   newMon,
      };
      persistState({ ...s, ...next });
      return next;
    });
  },

  rotateItems(ids) {
    const unlocked = ids.filter(id => !get().lockedIds.includes(id));
    if (!unlocked.length) return;
    get().saveToHistory();
    set(s => ({
      rooms:      s.rooms.map(r      => unlocked.includes(r.id) ? { ...r, rotation: (r.rotation      || 0) + 90 } : r),
      furnitures: s.furnitures.map(f => unlocked.includes(f.id) ? { ...f, rotation: (f.rotation || 0) + 90 } : f),
      doorways:   s.doorways.map(d   => unlocked.includes(d.id) ? { ...d, rotation: (d.rotation   || 0) + 90 } : d),
    }));
  },

  // ── Alerts ─────────────────────────────────────────────────────────────────
  acknowledgeAlert(alertId) {
    set(s => ({ alerts: s.alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a) }));
  },

  // ── Simulation tick ────────────────────────────────────────────────────────
  /**
   * tickSimulation — driven by simulationService every 3 s.
   *
   * Iterates over BOUND sensor nodes to:
   *   1. Simulate disconnect / reconnect events (2% chance).
   *   2. Simulate motion events (30% chance).
   *   3. Derive status (CONNECTED → INACTIVE → ALERT) from lastActive age.
   *   4. Write back to sensor.status and monitoringState[roomId].
   */
  tickSimulation() {
    set(s => {
      const boundNodes = s.sensors.filter(n => n.assignedDeviceId !== null);
      if (!boundNodes.length) return s;

      const now = Date.now();
      let updatedSensors  = [...s.sensors];
      const newMon        = { ...s.monitoringState };
      let newAlerts       = [...s.alerts];
      let connectedCount  = 0;

      boundNodes.forEach(node => {
        const roomId = node.logicalRoomId;
        let rs = { ...(newMon[roomId] ?? {
          status: 'NORMAL', connectionStatus: 'CONNECTED',
          deviceId: node.assignedDeviceId, lastActive: now, lastSeen: now, logs: [],
        })};

        // 2% disconnect/reconnect
        if (Math.random() < 0.02) {
          if (rs.connectionStatus === 'CONNECTED') {
            rs  = { ...rs, connectionStatus: 'DISCONNECTED', logs: [{ time: now, msg: 'Device disconnected (timeout)' }, ...rs.logs].slice(0, 10) };
            newAlerts = [{ id: `alert-dc-${now}-${node.id}`, roomId, roomName: s.logicalRooms.find(r => r.id === roomId)?.name ?? '', message: `Device offline in ${s.logicalRooms.find(r => r.id === roomId)?.name ?? 'room'}`, timestamp: now, acknowledged: false }, ...newAlerts];
            updatedSensors = updatedSensors.map(n => n.id === node.id ? { ...n, status: 'DISCONNECTED' } : n);
          } else {
            rs  = { ...rs, connectionStatus: 'CONNECTED', lastSeen: now, logs: [{ time: now, msg: 'Device reconnected' }, ...rs.logs].slice(0, 10) };
            updatedSensors = updatedSensors.map(n => n.id === node.id ? { ...n, status: 'CONNECTED' } : n);
          }
        }

        if (rs.connectionStatus === 'CONNECTED') {
          connectedCount++;
          rs = { ...rs, lastSeen: now };
          if (Math.random() < 0.3) {
            rs = { ...rs, lastActive: now, logs: [{ time: now, msg: 'Motion detected' }, ...rs.logs].slice(0, 10) };
          }
          if (rs.status !== 'ALERT') {
            const diffSec = (now - (rs.lastActive ?? now)) / 1000;
            const newStatus = diffSec > 15 ? 'ALERT' : diffSec > 8 ? 'INACTIVE' : 'NORMAL';
            if (newStatus === 'ALERT') {
              newAlerts = [{ id: `alert-${now}-${node.id}`, roomId, roomName: s.logicalRooms.find(r => r.id === roomId)?.name ?? '', message: `Inactivity alert in ${s.logicalRooms.find(r => r.id === roomId)?.name ?? 'room'}`, timestamp: now, acknowledged: false }, ...newAlerts];
            }
            rs = { ...rs, status: newStatus };
            // Mirror to sensor node status
            updatedSensors = updatedSensors.map(n =>
              n.id === node.id && n.assignedDeviceId
                ? { ...n, status: newStatus }
                : n
            );
          }
        }

        if (roomId) newMon[roomId] = rs;
      });

      return {
        sensors:        updatedSensors,
        monitoringState: newMon,
        alerts:          newAlerts,
        gatewayStats:    { lastSyncTime: now, packetsReceived: s.gatewayStats.packetsReceived + connectedCount },
      };
    });
  },
}));

// ─── Private helpers ──────────────────────────────────────────────────────────

function _snapshot(s) {
  return {
    rooms:             [...s.rooms],
    furnitures:        [...s.furnitures],
    doorways:          [...s.doorways],
    logicalRooms:      [...s.logicalRooms],
    sensors:           s.sensors.map(n => ({ ...n })),
    gatewayNode:       s.gatewayNode ? { ...s.gatewayNode } : null,
    discoveredDevices: s.discoveredDevices.map(d => ({ ...d })),
    monitoringState:   { ...s.monitoringState },
    lockedIds:         [...s.lockedIds],
    settings:          { ...s.settings },
  };
}

export default useStore;
