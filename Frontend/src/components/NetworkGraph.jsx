import React, { useMemo } from 'react';
import useStore from '../store/useStore';
import { useStore as useStoreDirect } from 'zustand';

/* ─── Soft status colors ─────────────────────────────────────────────────── */
const STATUS_COLOR = {
  NORMAL:        'var(--status-active)',
  INACTIVE:      'var(--status-warn)',
  ALERT:         'var(--status-alert)',
  DISCONNECTED:  'var(--status-offline)',
};

const STATUS_LABEL = {
  NORMAL:       'Active',
  INACTIVE:     'Quiet',
  ALERT:        'Attention',
  DISCONNECTED: 'Offline',
};

const NetworkGraph = () => {
  const logicalRooms    = useStore(s => s.logicalRooms);
  const monitoringState = useStore(s => s.monitoringState);
  const sensors         = useStore(s => s.sensors);

  const CX = 300, CY = 195;
  const radius = Math.min(140, Math.max(90, 60 + logicalRooms.length * 15));

  const nodes = useMemo(() => logicalRooms.map((room, i) => {
    const angle = (2 * Math.PI * i) / logicalRooms.length - Math.PI / 2;
    const roomNodes   = sensors.filter(n => n.logicalRoomId === room.id);
    const boundNodes  = roomNodes.filter(n => n.assignedDeviceId);
    // Worst status from sensor nodes
    const worstStatus = (() => {
      if (!boundNodes.length) return 'DISCONNECTED';
      if (boundNodes.some(n => n.status === 'ALERT'))        return 'ALERT';
      if (boundNodes.some(n => n.status === 'DISCONNECTED')) return 'DISCONNECTED';
      if (boundNodes.some(n => n.status === 'INACTIVE'))     return 'INACTIVE';
      return 'NORMAL';
    })();
    return {
      ...room,
      cx: CX + radius * Math.cos(angle),
      cy: CY + radius * Math.sin(angle),
      status: worstStatus,
      hasDevice: boundNodes.length > 0,
    };
  }), [logicalRooms, monitoringState, sensors, radius]);

  /* empty state */
  if (logicalRooms.length === 0) {
    return (
      <div style={{
        width: '100%', height: '300px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-raised)', borderRadius: '18px', border: '2px dashed var(--border-subtle)',
        gap: '0.5rem',
      }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--brand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        </div>
        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>Add rooms to see the network graph</span>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%', height: '300px',
      background: 'var(--bg-surface)', borderRadius: '18px',
      border: '1px solid var(--border-subtle)',
      overflow: 'hidden', position: 'relative',
    }}>
      <svg width="100%" height="100%" viewBox="0 0 600 390" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
        <defs>
          {/* Glow filter for gateway */}
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          {/* Radial bg gradient */}
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--bg-surface)"/>
            <stop offset="100%" stopColor="var(--bg-base)"/>
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width="600" height="390" fill="url(#bgGrad)" />

        {/* ── Connection lines ── */}
        {nodes.map(node => {
          const color = STATUS_COLOR[node.status] ?? STATUS_COLOR.NORMAL;
          const opacity = node.hasDevice ? 0.25 : 0.08;
          return (
            <line key={`l-${node.id}`}
              x1={CX} y1={CY} x2={node.cx} y2={node.cy}
              stroke={color} strokeWidth={1.5} strokeOpacity={opacity}
              strokeDasharray={!node.hasDevice ? '4 4' : undefined}
            />
          );
        })}

        {/* ── Animated particles (only for connected rooms) ── */}
        {nodes.filter(n => n.hasDevice && n.status !== 'DISCONNECTED').map((node, i) => {
          const color = STATUS_COLOR[node.status] ?? STATUS_COLOR.NORMAL;
          // Stagger durations so they don't all move together
          const dur = `${2.2 + (i * 0.4)}s`;
          return (
            <circle key={`p-${node.id}`} r="3" fill={color} opacity="0.85">
              <animateMotion
                dur={dur}
                repeatCount="indefinite"
                path={`M ${node.cx} ${node.cy} L ${CX} ${CY}`}
              />
            </circle>
          );
        })}

        {/* ── Gateway (centre) ── */}
        {/* Outer pulse for active state */}
        <circle cx={CX} cy={CY} r="36" fill="var(--brand)" opacity="0.05">
          <animate attributeName="r" values="36;44;36" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.06;0.01;0.06" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={CX} cy={CY} r="28" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth="2" filter="url(#glow)" />
        <circle cx={CX} cy={CY} r="10" fill="var(--brand)" opacity="0.9" />
        <text x={CX} y={CY + 46} fill="var(--text-tertiary)" fontSize="10" textAnchor="middle" fontWeight="500" letterSpacing="0.5">
          Gateway
        </text>

        {/* ── Room nodes ── */}
        {nodes.map(node => {
          const color = STATUS_COLOR[node.status];
          const label = STATUS_LABEL[node.status] ?? node.status;
          const isAlert = node.status === 'ALERT';
          const shortName = node.name.length > 8 ? node.name.slice(0, 7) + '…' : node.name;

          return (
            <g key={`n-${node.id}`} opacity={node.hasDevice ? 1 : 0.5}>
              {/* Pulse ring on ALERT */}
              {isAlert && (
                <circle cx={node.cx} cy={node.cy} r="22" fill="none" stroke={color} strokeWidth="1.5" opacity="0.4">
                  <animate attributeName="r"       values="22;36;22" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Node bg */}
              <circle cx={node.cx} cy={node.cy} r="22"
                fill="var(--bg-surface)"
                stroke={color}
                strokeWidth="2"
              />
              {/* Initial letter */}
              <text x={node.cx} y={node.cy + 5}
                fill="var(--text-primary)" fontSize="13" textAnchor="middle" fontWeight="600">
                {node.name.charAt(0).toUpperCase()}
              </text>
              {/* Room name */}
              <text x={node.cx} y={node.cy + 38}
                fill="var(--text-secondary)" fontSize="10" textAnchor="middle">
                {shortName}
              </text>
              {/* Status label */}
              <text x={node.cx} y={node.cy + 50}
                fill={color} fontSize="9" textAnchor="middle" fontWeight="500">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default NetworkGraph;
