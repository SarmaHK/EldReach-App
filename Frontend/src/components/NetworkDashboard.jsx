import React, { useState } from 'react';
import {
  Activity, Search, ChevronDown, ChevronUp, Clock,
  Home, Wifi, WifiOff, AlertTriangle, Heart, Shield,
} from 'lucide-react';
import useStore from '../store/useStore';
import NetworkGraph from './NetworkGraph';

/* ─── Design tokens (mapped to global CSS variables) ─────────────────── */
const C = {
  active:     'var(--status-active)',
  activeBg:   'var(--status-active-bg)',
  activeBorder:'var(--status-active)',
  warn:       'var(--status-warn)',
  warnBg:     'var(--status-warn-bg)',
  warnBorder: 'var(--status-warn)',
  alert:      'var(--status-alert)',
  alertBg:    'var(--status-alert-bg)',
  alertBorder:'var(--status-alert)',
  offline:    'var(--status-offline)',
  offlineBg:  'var(--status-offline-bg)',
  offlineBorder:'var(--border-subtle)',
  surface:    'var(--bg-surface)',
  raised:     'var(--bg-raised)',
  border:     'var(--border-subtle)',
  text1:      'var(--text-primary)',
  text2:      'var(--text-secondary)',
  text3:      'var(--text-tertiary)',
  brand:      'var(--brand)',
  brandBg:    'var(--brand-soft)',
};

/* ─── Status config — user-friendly language ─────────────────────────────── */
const STATUS_CFG = {
  NORMAL:        { label: 'All good',         color: C.active,  bg: C.activeBg,  border: C.activeBorder,  icon: <Wifi size={13}/> },
  INACTIVE:      { label: 'Quiet',            color: C.warn,    bg: C.warnBg,    border: C.warnBorder,    icon: <Clock size={13}/> },
  ALERT:         { label: 'Needs attention',  color: C.alert,   bg: C.alertBg,   border: C.alertBorder,   icon: <AlertTriangle size={13}/> },
  DISCONNECTED:  { label: 'Offline',          color: C.offline, bg: C.offlineBg, border: C.offlineBorder, icon: <WifiOff size={13}/> },
  connected:     { label: 'Active',           color: C.active,  bg: C.activeBg,  border: C.activeBorder,  icon: <Wifi size={13}/> },
  not_connected: { label: 'Disconnected',     color: C.offline, bg: C.offlineBg, border: C.offlineBorder, icon: <WifiOff size={13}/> },
  no_sensor:     { label: 'No sensor',        color: C.text3,   bg: 'transparent', border: C.border,      icon: null },
};

const StatusPill = ({ status }) => {
  const cfg = STATUS_CFG[status] ?? { label: status ?? '—', color: C.text2, bg: 'transparent', border: C.border, icon: null };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '99px',
      backgroundColor: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: '0.72rem', fontWeight: 500,
      transition: 'all 0.2s',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

/* ─── Friendly time format ───────────────────────────────────────────────── */
const relTime = (ts) => {
  if (!ts) return '—';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10)  return 'just now';
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

/* ─── Room Card ──────────────────────────────────────────────────────────── */
const RoomCard = ({ row, expanded, onToggle }) => {
  const statusCfg = STATUS_CFG[row.status] ?? STATUS_CFG.no_sensor;

  // Border left accent color
  const accentColor = row.status === 'ALERT' ? C.alert
    : row.status === 'INACTIVE' ? C.warn
    : row.status === 'NORMAL'   ? C.active
    : C.border;

  return (
    <div style={{
      background: C.surface,
      borderRadius: '16px',
      border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${accentColor}`,
      overflow: 'hidden',
      transition: 'box-shadow 0.2s, transform 0.15s',
      animation: 'fadeIn 0.25s ease-out',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* ── Card header ── */}
      <div
        onClick={onToggle}
        style={{ padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
      >
        {/* Left: room info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
          {/* Room icon */}
          <div style={{
            width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
            background: row.hasDevice ? C.activeBg : C.offlineBg,
            border: `1px solid ${row.hasDevice ? C.activeBorder : C.offlineBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Home size={16} color={row.hasDevice ? C.active : C.offline} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ color: C.text1, fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>
              {row.roomName}
            </div>
            <div style={{ color: C.text3, fontSize: '0.72rem' }}>
              {row.nodeCount === 0
                ? 'No sensors placed'
                : `${row.boundCount} of ${row.nodeCount} sensor${row.nodeCount !== 1 ? 's' : ''} active`}
            </div>
          </div>
        </div>

        {/* Right: status + expand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {row.hasDevice && row.status && <StatusPill status={row.status} />}
          {!row.hasDevice && <span style={{ fontSize: '0.72rem', color: C.text3 }}>No device</span>}
          <div style={{ color: C.text3, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
            <ChevronDown size={15} />
          </div>
        </div>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{
          borderTop: `1px solid ${C.border}`,
          padding: '1rem 1.25rem',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem',
          animation: 'fadeIn 0.18s ease-out',
        }}>
          {/* Device info */}
          <div>
            <div style={{ fontSize: '0.7rem', color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>Device</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Row label="ID" value={<span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: C.brand }}>{row.deviceId ?? '—'}</span>} />
              <Row label="Connection" value={<StatusPill status={row.hwStatus} />} />
              <Row label="Last seen" value={<span style={{ color: C.text2, fontSize: '0.78rem' }}>{relTime(row.lastSeen)}</span>} />
              <Row label="Last activity" value={<span style={{ color: C.text2, fontSize: '0.78rem' }}>{relTime(row.lastActive)}</span>} />
            </div>
          </div>

          {/* Activity log */}
          <div>
            <div style={{ fontSize: '0.7rem', color: C.text3, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>Recent activity</div>
            {row.activity.length === 0 ? (
              <div style={{ color: C.text3, fontSize: '0.78rem' }}>No recent activity</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {row.activity.slice(0, 5).map((log, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.75rem', alignItems: 'flex-start' }}>
                    <span style={{ color: C.text3, whiteSpace: 'nowrap', paddingTop: '1px' }}>
                      {relTime(log.time)}
                    </span>
                    <span style={{ color: C.text2 }}>{log.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Simple label-value row ── */
const Row = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
    <span style={{ fontSize: '0.75rem', color: C.text3 }}>{label}</span>
    {value}
  </div>
);

/* ─── System Status Hero ─────────────────────────────────────────────────── */
const SystemHero = ({ status, gatewayStats, alertCount, logicalRooms, sensors, discoveredDevices }) => {
  const boundSensors = sensors.filter(n => n.assignedDeviceId).length;
  const totalSensors = sensors.length;
  const totalDevices = discoveredDevices?.length || 0;
  const activeDevices = discoveredDevices?.filter(d => d.connectionStatus === 'CONNECTED').length || 0;

  const statusMsg = status === 'HEALTHY'  ? 'Everything looks good.'
                  : status === 'DEGRADED' ? 'Some sensors need attention.'
                  : 'Immediate attention needed.';
  const statusColor = status === 'HEALTHY' ? C.active : status === 'DEGRADED' ? C.warn : C.alert;

  return (
    <div style={{
      background: C.surface,
      borderRadius: '18px',
      border: `1px solid ${C.border}`,
      padding: '1.5rem',
      display: 'flex', flexDirection: 'column', gap: '1.25rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: C.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
            Home Status
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: statusColor, lineHeight: 1.2 }}>
            {status === 'HEALTHY' ? 'All Good' : status === 'DEGRADED' ? 'Attention' : 'Alert'}
          </div>
          <div style={{ fontSize: '0.78rem', color: C.text2, marginTop: '0.25rem' }}>{statusMsg}</div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: '12px',
          background: status === 'HEALTHY' ? C.activeBg : status === 'DEGRADED' ? C.warnBg : C.alertBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {status === 'HEALTHY' ? <Heart size={20} color={statusColor} /> :
           status === 'DEGRADED' ? <Clock size={20} color={statusColor} /> :
           <AlertTriangle size={20} color={statusColor} />}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.6rem' }}>
        <StatChip label="Rooms" value={logicalRooms.length} color={C.brand} />
        <StatChip label="Devices" value={totalDevices} color={C.active} />
        <StatChip label="Active" value={activeDevices} color={totalDevices > 0 ? C.active : C.text3} />
        <StatChip label="Alerts" value={alertCount} color={alertCount > 0 ? C.alert : C.text3} />
      </div>

      {/* Gateway */}
      <div style={{
        padding: '0.75rem 1rem',
        background: C.raised,
        borderRadius: '10px',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <Shield size={15} color={C.brand} />
        <div>
          <div style={{ fontSize: '0.73rem', color: C.text2, fontWeight: 500 }}>Gateway · {gatewayStats ? new Date(gatewayStats.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}</div>
          <div style={{ fontSize: '0.65rem', color: C.text3 }}>System running normally</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: C.active, fontWeight: 500 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.active, display: 'inline-block' }} />
            Online
          </span>
        </div>
      </div>
    </div>
  );
};

const StatChip = ({ label, value, color }) => (
  <div style={{
    background: C.raised, borderRadius: '10px', padding: '0.7rem 0.9rem',
    border: `1px solid ${C.border}`,
  }}>
    <div style={{ fontSize: '0.65rem', color: C.text3, marginBottom: '3px' }}>{label}</div>
    <div style={{ fontSize: '1.1rem', fontWeight: 600, color }}>{value}</div>
  </div>
);

/* ─── Main Dashboard ─────────────────────────────────────────────────────── */
const NetworkDashboard = () => {
  const [search,         setSearch]         = useState('');
  const [expandedRoomId, setExpandedRoomId] = useState(null);

  const sensors          = useStore(s => s.sensors);
  const logicalRooms     = useStore(s => s.logicalRooms);
  const monitoringState  = useStore(s => s.monitoringState);
  const discoveredDevices = useStore(s => s.discoveredDevices);
  const gatewayStats     = useStore(s => s.gatewayStats);

  const alertCount       = Object.values(monitoringState).filter(s => s.status === 'ALERT').length;
  const disconnectedCount = Object.values(monitoringState).filter(s => s.connectionStatus === 'DISCONNECTED').length;

  let systemStatus = 'HEALTHY';
  if (alertCount > 0)        systemStatus = 'CRITICAL';
  else if (disconnectedCount > 0) systemStatus = 'DEGRADED';

  const rows = logicalRooms.map(lr => {
    const roomNodes  = sensors.filter(n => n.logicalRoomId === lr.id);
    const boundNodes = roomNodes.filter(n => n.assignedDeviceId);
    const monState   = monitoringState[lr.id] ?? {};
    const primaryNode = boundNodes[0];
    const deviceId    = primaryNode?.assignedDeviceId ?? null;

    let hwStatus = 'no_sensor';
    if (primaryNode) {
      hwStatus = (primaryNode.status === 'CONNECTED' || primaryNode.status === 'INACTIVE')
        ? 'connected' : 'not_connected';
    }

    const worstStatus = (() => {
      if (!boundNodes.length)                                  return null;
      if (boundNodes.some(n => n.status === 'ALERT'))          return 'ALERT';
      if (boundNodes.some(n => n.status === 'DISCONNECTED'))   return 'DISCONNECTED';
      if (boundNodes.some(n => n.status === 'INACTIVE'))       return 'INACTIVE';
      return 'NORMAL';
    })();

    return {
      roomId: lr.id, roomName: lr.name, deviceId, hwStatus,
      status: worstStatus,
      connectionStatus: primaryNode?.status === 'DISCONNECTED' ? 'DISCONNECTED' : primaryNode ? 'CONNECTED' : null,
      activity: monState.logs ?? [],
      lastActive: monState.lastActive, lastSeen: monState.lastSeen,
      battery: deviceId ? 100 : null,
      hasDevice: !!primaryNode, nodeCount: roomNodes.length, boundCount: boundNodes.length,
    };
  });

  const filtered = rows.filter(r =>
    r.roomName.toLowerCase().includes(search.toLowerCase()) ||
    (r.deviceId ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-base)', padding: '1.75rem 2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── Top grid: System Status + Network Graph ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
        <SystemHero
          status={systemStatus}
          gatewayStats={gatewayStats}
          alertCount={alertCount}
          logicalRooms={logicalRooms}
          sensors={sensors}
          discoveredDevices={discoveredDevices}
        />
        <NetworkGraph />
      </div>

      {/* ── Room cards section ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Your Rooms
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: 'var(--text-tertiary)' }}>
            {logicalRooms.length} room{logicalRooms.length !== 1 ? 's' : ''} · {rows.filter(r => r.hasDevice).length} monitored
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={13} color="var(--text-tertiary)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search rooms…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: '8px', padding: '0.4rem 0.8rem 0.4rem 2rem',
              color: 'var(--text-primary)', outline: 'none',
              fontSize: '0.78rem', width: '200px',
              transition: 'border-color 0.15s',
            }}
            onFocus={e  => e.target.style.borderColor = C.brand}
            onBlur={e   => e.target.style.borderColor = C.border}
          />
        </div>
      </div>

      {/* ── Room cards grid ── */}
      {filtered.length === 0 ? (
        <div style={{
          background: C.raised, borderRadius: '16px', border: `2px dashed ${C.border}`,
          padding: '3rem', textAlign: 'center',
        }}>
          <Home size={32} color={C.text3} style={{ marginBottom: '0.75rem' }} />
          <div style={{ color: C.text2, fontSize: '0.9rem', fontWeight: 500 }}>
            {logicalRooms.length === 0
              ? 'No rooms yet'
              : 'No rooms match your search'}
          </div>
          <div style={{ color: C.text3, fontSize: '0.78rem', marginTop: '0.35rem' }}>
            {logicalRooms.length === 0
              ? 'Switch to Room Architect to set up your floor plan and place sensors.'
              : 'Try a different search term.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filtered.map(row => (
            <RoomCard
              key={row.roomId}
              row={row}
              expanded={expandedRoomId === row.roomId}
              onToggle={() => setExpandedRoomId(expandedRoomId === row.roomId ? null : row.roomId)}
            />
          ))}
        </div>
      )}

      {/* ── Subtle keyframe injection ── */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      </div>
    </div>
  );
};

export default NetworkDashboard;
