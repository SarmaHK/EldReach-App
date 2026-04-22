/**
 * RoomDeviceAssignment.jsx
 *
 * Shows all sensor nodes belonging to a logical room.
 * For each node:
 *   - Status dot + short device ID (or "Unbound")
 *   - Manual bind/unbind via dropdown picker
 *
 * No scan UI, no unassigned lists.
 */

import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, Wifi, WifiOff, Plus } from 'lucide-react';
import useStore from '../store/useStore';

// Node status → visual
const NODE_STATUS = {
  UNBOUND:      { label: 'Unbound',    color: '#475569', glow: false },
  CONNECTED:    { label: 'Active',     color: '#10b981', glow: true  },
  INACTIVE:     { label: 'Inactive',   color: '#f59e0b', glow: false },
  ALERT:        { label: 'Alert',      color: '#ef4444', glow: true  },
  DISCONNECTED: { label: 'Offline',    color: '#64748b', glow: false },
};

const DeviceStatus = (cs) => {
  if (cs === 'CONNECTED')  return { label: 'Active',        color: '#10b981' };
  if (cs === 'CONNECTING') return { label: 'Connecting…',   color: '#f59e0b' };
  return                          { label: 'Offline',       color: '#64748b' };
};

const RoomDeviceAssignment = ({ room }) => {
  const sensors            = useStore(s => s.sensors);
  const discoveredDevices  = useStore(s => s.discoveredDevices);
  const addSensorNode      = useStore(s => s.addSensorNode);
  const bindDeviceToNode   = useStore(s => s.bindDeviceToNode);
  const unassignNode       = useStore(s => s.unassignNode);

  // Which node's picker is currently open
  const [openNodeId, setOpenNodeId] = useState(null);

  if (!room) return null;

  const roomNodes = sensors
    .filter(n => n.logicalRoomId === room.id)
    .sort((a, b) => a.createdAt - b.createdAt);

  // Devices available to bind: unassigned + the one already on this node
  const getAvailableDevices = (currentDeviceId) =>
    discoveredDevices.filter(d => !d.assignedNodeId || d.deviceId === currentDeviceId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Sensor Nodes</span>
        {/* Add another node to this room */}
        <button
          onClick={() => addSensorNode(room.id, room.bounds.x + room.bounds.width / 2, room.bounds.y + room.bounds.height / 2)}
          title="Place a sensor node in this room"
          style={{
            display: 'flex', alignItems: 'center', gap: '3px',
            background: 'var(--brand-soft)', border: '1px solid var(--brand-border)',
            borderRadius: '5px', padding: '3px 7px',
            color: 'var(--brand)', fontSize: '0.65rem', cursor: 'pointer',
          }}
        >
          <Plus size={10} /> Add Node
        </button>
      </div>

      {roomNodes.length === 0 ? (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '6px 0' }}>
          No sensor nodes placed. Click "Add Node" or use "Place Sensor" in the toolbar.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {roomNodes.map(node => {
            const ns      = NODE_STATUS[node.status] ?? NODE_STATUS.UNBOUND;
            const isOpen  = openNodeId === node.id;
            const available = getAvailableDevices(node.assignedDeviceId);

            return (
              <div key={node.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {/* Node row */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: node.assignedDeviceId ? 'var(--status-active-bg)' : 'var(--bg-surface)',
                  border: `1px solid ${node.assignedDeviceId ? 'var(--status-active)' : 'var(--border-subtle)'}`,
                  borderRadius: '6px', padding: '7px 10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    {/* Status dot */}
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: ns.color,
                      boxShadow: ns.glow ? `0 0 5px ${ns.color}` : 'none',
                      flexShrink: 0,
                    }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: node.assignedDeviceId ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {node.assignedDeviceId ?? 'Unbound'}
                      </span>
                      <span style={{ fontSize: '0.62rem', color: ns.color }}>
                        {ns.label}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => setOpenNodeId(isOpen ? null : node.id)}
                      style={miniBtn('#4F84FF')}
                      title={node.assignedDeviceId ? 'Change device' : 'Assign device'}
                    >
                      <ChevronDown size={10} />
                    </button>
                    {node.assignedDeviceId && (
                      <button
                        onClick={() => { unassignNode(node.id); setOpenNodeId(null); }}
                        style={miniBtn('#ef4444')}
                        title="Unbind device"
                      >
                        <WifiOff size={10} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Device picker dropdown */}
                {isOpen && (
                  <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px', padding: '5px',
                    display: 'flex', flexDirection: 'column', gap: '3px',
                    marginLeft: '8px',
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    {available.length === 0 ? (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', padding: '5px' }}>
                        No devices available. Gateway may be connecting.
                      </div>
                    ) : (
                      available.map(dev => {
                        const { label, color } = DeviceStatus(dev.connectionStatus);
                        const isCurrent = dev.deviceId === node.assignedDeviceId;
                        return (
                          <button
                            key={dev.id}
                            onClick={() => {
                              bindDeviceToNode(dev.id, node.id);
                              setOpenNodeId(null);
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              background: isCurrent ? 'var(--status-active-bg)' : 'var(--bg-surface)',
                              border: `1px solid ${isCurrent ? 'var(--status-active)' : 'var(--border-subtle)'}`,
                              borderRadius: '5px', padding: '6px 8px', cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                              <span style={{ fontSize: '0.73rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{dev.deviceId}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ fontSize: '0.63rem', color }}>{label}</span>
                              {isCurrent && <CheckCircle2 size={11} color="var(--status-active)" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                    <button onClick={() => setOpenNodeId(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: '0.63rem', cursor: 'pointer', textAlign: 'right', padding: '2px 4px' }}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const miniBtn = (color) => ({
  background: `${color}15`, border: `1px solid ${color}25`,
  borderRadius: '4px', padding: '3px 5px',
  color, cursor: 'pointer', display: 'flex', alignItems: 'center',
});

export default RoomDeviceAssignment;
