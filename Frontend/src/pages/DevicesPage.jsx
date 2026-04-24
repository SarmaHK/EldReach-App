import React, { useState } from 'react';
import { Wifi, Activity, Radio, Clock, Plus, WifiOff, ArrowRight, RefreshCw, Loader, Search, CheckCircle, AlertTriangle, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import useStore from '../store/useStore';
import ConnectDeviceModal from '../components/ConnectDeviceModal';
import { renameDevice, deleteDevice } from '../services/deviceService';

export default function DevicesPage() {
  const discoveredDevices = useStore(s => s.discoveredDevices);
  const devicesLoading = useStore(s => s.devicesLoading);
  const devicesError = useStore(s => s.devicesError);
  const backendSynced = useStore(s => s.backendSynced);
  const [modalMode, setModalMode] = useState(null);

  const connectedGateway = useStore(s => s.connectedGateway);
  const gatewayScanning = useStore(s => s.gatewayScanning);
  const gatewayScanError = useStore(s => s.gatewayScanError);
  const gatewayScanMessage = useStore(s => s.gatewayScanMessage);
  const scanGateway = useStore(s => s.scanGateway);

  // Device management state
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null); // { deviceId, currentName }
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { deviceId, displayName }
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleRetry = () => useStore.getState().refreshDevicePool();
  const handleScan = () => scanGateway();

  const hasGateway = !!connectedGateway;
  const hasDevices = discoveredDevices.length > 0;
  const gwOffline = connectedGateway && (connectedGateway.status === 'Offline' || connectedGateway.status === 'offline');

  // --- Rename handlers ---
  const openRename = (device) => {
    setMenuOpenId(null);
    setRenameTarget({ deviceId: device.deviceId, currentName: device.customName || '' });
    setRenameValue(device.customName || '');
  };
  const submitRename = async () => {
    if (!renameTarget) return;
    setRenameLoading(true);
    const result = await renameDevice(renameTarget.deviceId, renameValue.trim());
    if (result.success) {
      // Optimistic update
      useStore.setState(s => ({
        discoveredDevices: s.discoveredDevices.map(d =>
          d.deviceId === renameTarget.deviceId ? { ...d, customName: renameValue.trim() || null } : d
        ),
      }));
    }
    setRenameLoading(false);
    setRenameTarget(null);
  };

  // --- Delete handlers ---
  const openDelete = (device) => {
    setMenuOpenId(null);
    const name = device.customName ? `${device.customName} Device` : `Device ${device.deviceId.replace(/:/g, '').slice(-4)}`;
    setDeleteTarget({ deviceId: device.deviceId, displayName: name });
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const result = await deleteDevice(deleteTarget.deviceId);
    if (result.success) {
      useStore.setState(s => ({
        discoveredDevices: s.discoveredDevices.filter(d => d.deviceId !== deleteTarget.deviceId),
      }));
    }
    setDeleteLoading(false);
    setDeleteTarget(null);
  };

  // Device display name helper
  const deviceDisplayName = (d) =>
    d.customName ? `${d.customName} Device` : `Device ${d.deviceId.replace(/:/g, '').slice(-4)}`;

  return (
    <div className="page-wrapper page-wrapper--devices">
      <div className="page-header">
        <div className="page-header__row">
          <div>
            <h1 className="page-header__title">Devices</h1>
            <p className="page-header__subtitle">
              {hasGateway
                ? `Home Hub connected · ${discoveredDevices.length} device${discoveredDevices.length !== 1 ? 's' : ''}`
                : 'Start by finding your home hub, then add your devices.'}
            </p>
          </div>
          {hasDevices && (
            <button className="page-header__action" onClick={() => setModalMode('scan')}>
              <Plus size={16} /> Find Your Device
            </button>
          )}
        </div>
      </div>

      {/* ── Gateway Status Banner ── */}
      {hasGateway && (
        <div className={`gateway-banner ${gwOffline ? 'gateway-banner--offline' : ''}`} style={{
          backgroundColor: gwOffline ? 'var(--status-warn-bg)' : 'var(--bg-surface)',
          borderColor: gwOffline ? 'var(--status-warn)' : 'var(--border-subtle)'
        }}>
          <div className="gateway-banner__icon" style={{ color: gwOffline ? 'var(--status-warn)' : 'var(--status-active)' }}>
            <Radio size={18} />
          </div>
          <div className="gateway-banner__info">
            <span className="gateway-banner__label">
              {gwOffline ? 'Home Hub Offline ⚠️' : 'Home Hub Connected ✅'}
            </span>
            <span className="gateway-banner__detail" style={{ color: gwOffline ? 'var(--status-warn)' : 'var(--text-secondary)' }}>
              {gwOffline ? 'Devices temporarily unavailable' : `${connectedGateway.gatewayId} · ${connectedGateway.ip}`}
            </span>
          </div>
          <div className="gateway-banner__status">
            {gwOffline ? (
              <button onClick={handleScan} disabled={gatewayScanning} style={{
                fontSize: '0.78rem', fontWeight: 600, padding: '5px 14px', borderRadius: '8px',
                border: 'none', background: 'var(--status-warn)', color: '#fff',
                cursor: gatewayScanning ? 'not-allowed' : 'pointer',
                opacity: gatewayScanning ? 0.6 : 1,
              }}>
                {gatewayScanning ? 'Scanning…' : 'Reconnect Home Hub'}
              </button>
            ) : (
              <>
                <span className="status-dot active" style={{ backgroundColor: 'var(--status-active)' }} />
                <span style={{ color: 'var(--status-active)' }}>Connected</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── LOADING ── */}
      {(devicesLoading && !backendSynced) ? (
        <div className="empty-state-card">
          <div className="empty-state-card__icon-ring">
            <div className="empty-state-card__icon"><Loader size={36} strokeWidth={1.5} className="spin-animation" /></div>
          </div>
          <h2 className="empty-state-card__title">Loading devices…</h2>
          <p className="empty-state-card__desc">Connecting to system and fetching device data.</p>
        </div>

      ) : devicesError ? (
        <div className="empty-state-card">
          <div className="empty-state-card__icon-ring">
            <div className="empty-state-card__icon" style={{ color: 'var(--status-alert)' }}><WifiOff size={40} strokeWidth={1.5} /></div>
          </div>
          <h2 className="empty-state-card__title">Something went wrong</h2>
          <p className="empty-state-card__desc">{devicesError || 'Something went wrong. Please try again.'}</p>
          <div className="empty-state-card__actions">
            <button className="empty-state-card__cta" onClick={handleRetry}><RefreshCw size={18} /> Retry</button>
          </div>
        </div>

      ) : gatewayScanning ? (
        <div className="empty-state-card">
          <div className="empty-state-card__icon-ring">
            <div className="empty-state-card__icon gateway-scan-icon"><Search size={36} strokeWidth={1.5} className="scan-pulse" /></div>
            <div className="empty-state-card__pulse" />
          </div>
          <h2 className="empty-state-card__title">Scanning network…</h2>
          <p className="empty-state-card__desc">Looking for an EldReach home hub on your local network.</p>
          <div className="gateway-scan-progress"><div className="gateway-scan-progress__bar" /></div>
        </div>

      ) : gatewayScanError ? (
        <div className="empty-state-card">
          <div className="empty-state-card__icon-ring">
            <div className="empty-state-card__icon" style={{ color: 'var(--status-warn)' }}><AlertTriangle size={40} strokeWidth={1.5} /></div>
          </div>
          <h2 className="empty-state-card__title">
            {(gatewayScanError === 'GATEWAY_NOT_FOUND' || gatewayScanError === 'GATEWAY_SCAN_FAILED') ? 'Home Hub not found' : 'Connection Problem'}
          </h2>
          <p className="empty-state-card__desc">{gatewayScanMessage || 'We couldn\'t find your home hub on the network.'}</p>
          <div className="empty-state-card__actions">
            <button className="empty-state-card__cta" onClick={handleScan}><RefreshCw size={18} /> Retry Scan</button>
          </div>
        </div>

      ) : !hasGateway && discoveredDevices.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-card__icon-ring">
            <div className="empty-state-card__icon"><WifiOff size={40} strokeWidth={1.5} /></div>
            <div className="empty-state-card__pulse" />
          </div>
          <h2 className="empty-state-card__title">No devices added yet</h2>
          <p className="empty-state-card__desc">Start by finding your home hub, then add your devices.</p>
          <div className="empty-state-card__actions">
            <button className="empty-state-card__cta" onClick={handleScan} id="scan-gateway-btn"><Search size={18} /> Find Home Hub</button>
          </div>
        </div>

      ) : hasGateway && !hasDevices ? (
        <div className="empty-state-card">
          <div className="empty-state-card__icon-ring">
            <div className="empty-state-card__icon" style={{ color: 'var(--brand)' }}><Activity size={40} strokeWidth={1.5} /></div>
          </div>
          <h2 className="empty-state-card__title">No devices added yet</h2>
          <p className="empty-state-card__desc">Your home hub is online. Find a device to add it to the system.</p>
          <div className="empty-state-card__actions">
            <button className="empty-state-card__cta" onClick={() => setModalMode('scan')}><Plus size={18} /> Find Device</button>
            <button className="empty-state-card__link-btn" onClick={() => setModalMode('manual')}><Plus size={14} /> Add Manually</button>
          </div>
        </div>

      ) : (
        /* ── DEVICE LIST ── */
        <div className="devices-grid">
          {discoveredDevices.map(device => (
            <div key={device._id || device.id || device.deviceId} className="device-card card">
              <div className="device-card__header">
                <div className="device-card__icon" style={{
                  color: device.connectionStatus === 'active' ? 'var(--status-active)' : (device.connectionStatus === 'waiting' ? 'var(--status-warn)' : 'var(--status-offline)'),
                  backgroundColor: device.connectionStatus === 'active' ? 'var(--status-active-bg)' : (device.connectionStatus === 'waiting' ? 'var(--status-warn-bg)' : 'var(--status-offline-bg)'),
                }}>
                  <Radio size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="device-card__name">{deviceDisplayName(device)}</h3>
                  <span className="device-card__gateway">{device.gatewayId || 'No home hub'}</span>
                </div>

                {/* Status badge */}
                <span className={`device-card__status-badge ${device.connectionStatus === 'active' ? 'active' : (device.connectionStatus === 'waiting' ? 'waiting' : 'inactive')}`}
                  style={{
                    backgroundColor: (device.connectionStatus === 'offline' && device.statusReason === 'hub_disconnected') ? 'var(--status-warn-bg)' : undefined,
                    color: (device.connectionStatus === 'offline' && device.statusReason === 'hub_disconnected') ? 'var(--status-warn)' : undefined,
                    borderColor: (device.connectionStatus === 'offline' && device.statusReason === 'hub_disconnected') ? 'var(--status-warn)' : undefined,
                  }}>
                  {device.connectionStatus === 'active' ? 'Connected'
                    : device.connectionStatus === 'waiting' ? 'Connecting to device...'
                      : device.statusReason === 'hub_disconnected' ? 'Offline (Hub disconnected)'
                        : 'Offline'}
                </span>

                {/* ── Action Menu Toggle ── */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === device.deviceId ? null : device.deviceId)}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: '4px', borderRadius: '6px', color: 'var(--text-tertiary)',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <MoreVertical size={18} />
                  </button>

                  {/* Dropdown Menu */}
                  {menuOpenId === device.deviceId && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, zIndex: 50,
                      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                      borderRadius: '10px', boxShadow: 'var(--shadow-md)',
                      minWidth: '180px', overflow: 'hidden',
                      animation: 'fadeIn 0.12s ease-out',
                    }}>
                      <button onClick={() => openRename(device)} style={menuItemStyle}>
                        <Pencil size={14} /> Rename
                      </button>
                      {gwOffline && (
                        <button onClick={() => { setMenuOpenId(null); handleScan(); }} style={menuItemStyle}>
                          <RefreshCw size={14} /> Reconnect Home Hub
                        </button>
                      )}
                      <button onClick={() => openDelete(device)} style={{ ...menuItemStyle, color: 'var(--status-alert)' }}>
                        <Trash2 size={14} /> Remove Device
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="device-card__body">
                <div className="device-card__meta">
                  <div className="device-card__meta-item">
                    <Activity size={14} />
                    <span>Room: {device.roomId || device.assignedRoomId || '—'}</span>
                  </div>
                  <div className="device-card__meta-item">
                    <Clock size={14} />
                    <span>{device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'Never'}</span>
                  </div>
                </div>

                {device.sensors?.radar?.targets?.length > 0 && (
                  <div className="device-card__targets">
                    <span className="device-card__targets-label">Radar Targets</span>
                    {device.sensors.radar.targets.map((t, i) => (
                      <div key={i} className="device-card__target-row">
                        <span>x: {t.x?.toFixed(2)}</span>
                        <span>y: {t.y?.toFixed(2)}</span>
                        <span>v: {t.velocity?.toFixed(2)}</span>
                        <span>d: {t.distance?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {device.sensors?.presence && (
                  <div className="device-card__presence">
                    <span className={`presence-indicator ${device.sensors.presence.motionDetected ? 'on' : 'off'}`}>
                      Movement: {device.sensors.presence.motionDetected ? 'Yes' : 'No'}
                    </span>
                    <span className={`presence-indicator ${device.sensors.presence.breathingDetected ? 'on' : 'off'}`}>
                      Person is present: {device.sensors.presence.breathingDetected ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Rename Modal ── */}
      {renameTarget && (
        <div style={overlayStyle} onClick={() => !renameLoading && setRenameTarget(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>Rename Device</h3>
              <button onClick={() => setRenameTarget(null)} disabled={renameLoading} style={closeBtn}><X size={18} /></button>
            </div>
            <label style={labelStyle}>Room Name</label>
            <input
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              placeholder="e.g. Living Room"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && submitRename()}
              style={inputStyle}
            />
            <p style={{ margin: '0.5rem 0 1.25rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Device will show as "{renameValue.trim() ? `${renameValue.trim()} Device` : `Device ${renameTarget.deviceId.replace(/:/g, '').slice(-4)}`}"
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setRenameTarget(null)} disabled={renameLoading} style={secondaryBtnStyle}>Cancel</button>
              <button onClick={submitRename} disabled={renameLoading} style={primaryBtnStyle}>
                {renameLoading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <div style={overlayStyle} onClick={() => !deleteLoading && setDeleteTarget(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>Remove Device</h3>
              <button onClick={() => setDeleteTarget(null)} disabled={deleteLoading} style={closeBtn}><X size={18} /></button>
            </div>
            <div style={{
              padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem',
              background: 'var(--status-alert-bg)', border: '1px solid var(--status-alert)',
            }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--status-alert)', fontWeight: 500 }}>
                Are you sure you want to remove <strong>{deleteTarget.displayName}</strong>?
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                This will unregister the device. You can re-add it later using Find Device.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} disabled={deleteLoading} style={secondaryBtnStyle}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleteLoading} style={dangerBtnStyle}>
                {deleteLoading ? 'Removing…' : 'Remove Device'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConnectDeviceModal
        isOpen={!!modalMode}
        mode={modalMode}
        onClose={() => {
          setModalMode(null);
          useStore.getState().refreshDevicePool();
        }}
      />

      {/* Close menu on outside click */}
      {menuOpenId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenuOpenId(null)} />
      )}
    </div>
  );
}

// ── Inline style helpers ──
const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const modalStyle = {
  background: 'var(--bg-surface)', borderRadius: '16px',
  padding: '1.5rem', width: '100%', maxWidth: '420px',
  border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-lg)',
};
const closeBtn = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'var(--text-tertiary)', display: 'flex', padding: '4px',
};
const labelStyle = {
  display: 'block', fontSize: '0.78rem', fontWeight: 600,
  color: 'var(--text-secondary)', marginBottom: '0.4rem',
};
const inputStyle = {
  width: '100%', padding: '0.6rem 0.85rem', borderRadius: '10px',
  border: '1px solid var(--border-soft)', background: 'var(--bg-base)',
  color: 'var(--text-primary)', fontSize: '0.88rem', outline: 'none',
  boxSizing: 'border-box',
};
const primaryBtnStyle = {
  padding: '0.55rem 1.25rem', borderRadius: '10px', border: 'none',
  background: 'var(--brand)', color: '#fff', fontWeight: 600,
  fontSize: '0.82rem', cursor: 'pointer',
};
const secondaryBtnStyle = {
  padding: '0.55rem 1.25rem', borderRadius: '10px',
  border: '1px solid var(--border-subtle)', background: 'transparent',
  color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.82rem', cursor: 'pointer',
};
const dangerBtnStyle = {
  ...primaryBtnStyle, background: 'var(--status-alert)',
};
const menuItemStyle = {
  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
  padding: '10px 14px', border: 'none', background: 'transparent',
  color: 'var(--text-primary)', fontSize: '0.82rem', cursor: 'pointer',
  textAlign: 'left', transition: 'background 0.1s',
};
