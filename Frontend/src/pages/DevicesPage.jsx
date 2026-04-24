import React, { useState } from 'react';
import { Wifi, Activity, Radio, Clock, Plus, WifiOff, ArrowRight, RefreshCw, Loader, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import useStore from '../store/useStore';
import ConnectDeviceModal from '../components/ConnectDeviceModal';

/**
 * Devices page — shows connected sensor nodes with gateway-aware states:
 *
 *   LOADING:       Skeleton/spinner while fetching from backend
 *   ERROR:         Retry prompt if backend is unreachable
 *   NO_GATEWAY:    No gateway connected — show scan button
 *   SCANNING:      mDNS scan in progress
 *   SCAN_ERROR:    Scan failed (not found / handshake error)
 *   GATEWAY_OK:    Gateway connected, show devices
 *   EMPTY:         Gateway connected but no device data yet
 *   LIST:          Device card grid
 *
 * Data comes from `discoveredDevices` in the Zustand store,
 * which is populated by useBackendSync (called in Layout).
 */
export default function DevicesPage() {
  const discoveredDevices = useStore(s => s.discoveredDevices);
  const devicesLoading = useStore(s => s.devicesLoading);
  const devicesError = useStore(s => s.devicesError);
  const backendSynced = useStore(s => s.backendSynced);
  const [showModal, setShowModal] = useState(false);

  // Gateway connection state
  const connectedGateway = useStore(s => s.connectedGateway);
  const gatewayScanning = useStore(s => s.gatewayScanning);
  const gatewayScanError = useStore(s => s.gatewayScanError);
  const gatewayScanMessage = useStore(s => s.gatewayScanMessage);
  const scanGateway = useStore(s => s.scanGateway);

  const handleRetry = () => {
    useStore.getState().refreshDevicePool();
  };

  const handleScan = () => {
    scanGateway();
  };

  // Determine the current view state
  const hasGateway = !!connectedGateway;
  const hasDevices = discoveredDevices.length > 0;

  return (
    <div className="page-wrapper page-wrapper--devices">
      <div className="page-header">
        <div className="page-header__row">
          <div>
            <h1 className="page-header__title">Devices</h1>
            <p className="page-header__subtitle">
              {hasGateway
                ? `Gateway connected · ${discoveredDevices.length} sensor node${discoveredDevices.length !== 1 ? 's' : ''}`
                : 'Scan for your EldReach gateway to connect sensor nodes.'}
            </p>
          </div>
          {hasDevices && (
            <button
              className="page-header__action"
              onClick={() => setShowModal(true)}
            >
              <Plus size={16} />
              Connect Device
            </button>
          )}
        </div>
      </div>

      {/* ── Gateway Status Banner ──────────────────────────────────── */}
      {hasGateway && (
        <div className="gateway-banner">
          <div className="gateway-banner__icon">
            <Radio size={18} />
          </div>
          <div className="gateway-banner__info">
            <span className="gateway-banner__label">Gateway Connected</span>
            <span className="gateway-banner__detail">
              {connectedGateway.gatewayId} · {connectedGateway.ip}
            </span>
          </div>
          <div className="gateway-banner__status">
            <span className="status-dot active" />
            <span>Online</span>
          </div>
        </div>
      )}

      {/* ── LOADING STATE ─────────────────────────────────────── */}
      {(devicesLoading && !backendSynced) ? (
        <div className="empty-state-card">
          <div className="empty-state-card__icon-ring">
            <div className="empty-state-card__icon">
              <Loader size={36} strokeWidth={1.5} className="spin-animation" />
            </div>
          </div>
          <h2 className="empty-state-card__title">Loading devices…</h2>
          <p className="empty-state-card__desc">
            Connecting to backend and fetching sensor node data.
          </p>
        </div>

      /* ── ERROR STATE ──────────────────────────────────────── */
      ) : devicesError ? (
        <div className="empty-state-card">
          <div className="empty-state-card__icon-ring">
            <div className="empty-state-card__icon" style={{ color: 'var(--status-alert)' }}>
              <WifiOff size={40} strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="empty-state-card__title">Unable to load devices</h2>
          <p className="empty-state-card__desc">
            {devicesError}
          </p>
          <div className="empty-state-card__actions">
            <button className="empty-state-card__cta" onClick={handleRetry}>
              <RefreshCw size={18} />
              Retry
            </button>
          </div>
        </div>

      /* ── SCANNING STATE ────────────────────────────────────── */
      ) : gatewayScanning ? (
        <div className="empty-state-card">
          <div className="empty-state-card__icon-ring">
            <div className="empty-state-card__icon gateway-scan-icon">
              <Search size={36} strokeWidth={1.5} className="scan-pulse" />
            </div>
            <div className="empty-state-card__pulse" />
          </div>
          <h2 className="empty-state-card__title">Scanning network…</h2>
          <p className="empty-state-card__desc">
            Looking for an EldReach gateway on your local network via mDNS.
            This may take a few seconds.
          </p>
          <div className="gateway-scan-progress">
            <div className="gateway-scan-progress__bar" />
          </div>
        </div>

      /* ── SCAN ERROR STATE ──────────────────────────────────── */
      ) : gatewayScanError ? (
        <div className="empty-state-card">
          <div className="empty-state-card__icon-ring">
            <div className="empty-state-card__icon" style={{ color: 'var(--status-warn)' }}>
              <AlertTriangle size={40} strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="empty-state-card__title">
            {gatewayScanError === 'GATEWAY_NOT_FOUND' ? 'No gateway found' : 'Connection failed'}
          </h2>
          <p className="empty-state-card__desc">
            {gatewayScanMessage}
          </p>
          <div className="empty-state-card__actions">
            <button className="empty-state-card__cta" onClick={handleScan}>
              <Search size={18} />
              Scan Again
            </button>
          </div>
          <div className="empty-state-card__tips">
            <div className="empty-state-card__tip">
              <Radio size={16} />
              <div>
                <strong>Check your gateway</strong>
                <span>Make sure the EldReach gateway is powered on and connected to the same network.</span>
              </div>
            </div>
            <div className="empty-state-card__tip">
              <Wifi size={16} />
              <div>
                <strong>Network issues?</strong>
                <span>Verify that mDNS/Bonjour is not blocked by your firewall.</span>
              </div>
            </div>
          </div>
        </div>

      /* ── EMPTY STATE (No gateway connected yet) ────────────── */
      ) : !hasGateway && discoveredDevices.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-card__icon-ring">
            <div className="empty-state-card__icon">
              <WifiOff size={40} strokeWidth={1.5} />
            </div>
            <div className="empty-state-card__pulse" />
          </div>
          <h2 className="empty-state-card__title">No devices connected</h2>
          <p className="empty-state-card__desc">
            Scan your network to discover the EldReach gateway. Once connected,
            sensor nodes will appear automatically.
          </p>
          <div className="empty-state-card__actions">
            <button
              className="empty-state-card__cta"
              onClick={handleScan}
              id="scan-gateway-btn"
            >
              <Search size={18} />
              Scan for Devices
            </button>
            <button
              className="empty-state-card__link-btn"
              onClick={() => setShowModal(true)}
            >
              <Plus size={14} />
              Add Manually
            </button>
          </div>

          {/* Quick tips */}
          <div className="empty-state-card__tips">
            <div className="empty-state-card__tip">
              <Radio size={16} />
              <div>
                <strong>Auto-discovery</strong>
                <span>The scan uses mDNS to find your gateway on the local network automatically.</span>
              </div>
            </div>
            <div className="empty-state-card__tip">
              <Wifi size={16} />
              <div>
                <strong>Using the simulator?</strong>
                <span>Run <code>node simulator.js</code> in the Backend folder, or add a device manually.</span>
              </div>
            </div>
          </div>
        </div>

      /* ── DEVICE LIST ──────────────────────────────────────── */
      ) : (
        <div className="devices-grid">
          {discoveredDevices.map(device => (
            <div key={device._id || device.id || device.deviceId} className="device-card card">
              <div className="device-card__header">
                <div className="device-card__icon" style={{
                  color: device.connectionStatus === 'CONNECTED' ? 'var(--status-active)' : 'var(--status-offline)',
                  backgroundColor: device.connectionStatus === 'CONNECTED' ? 'var(--status-active-bg)' : 'var(--status-offline-bg)',
                }}>
                  <Radio size={20} />
                </div>
                <div>
                  <h3 className="device-card__name">{device.deviceId}</h3>
                  <span className="device-card__gateway">{device.gatewayId || 'No gateway'}</span>
                </div>
                <span className={`device-card__status-badge ${device.connectionStatus === 'CONNECTED' ? 'active' : 'inactive'}`}>
                  {device.connectionStatus === 'CONNECTED' ? 'active' : device.status || 'offline'}
                </span>
              </div>

              <div className="device-card__body">
                <div className="device-card__meta">
                  <div className="device-card__meta-item">
                    <Activity size={14} />
                    <span>Room: {device.roomId || device.assignedRoomId || '—'}</span>
                  </div>
                  <div className="device-card__meta-item">
                    <Clock size={14} />
                    <span>
                      {device.lastSeen
                        ? new Date(device.lastSeen).toLocaleTimeString()
                        : 'Never'}
                    </span>
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
                      Motion: {device.sensors.presence.motionDetected ? 'Yes' : 'No'}
                    </span>
                    <span className={`presence-indicator ${device.sensors.presence.breathingDetected ? 'on' : 'off'}`}>
                      Breathing: {device.sensors.presence.breathingDetected ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect Device Modal */}
      <ConnectDeviceModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          // Refresh device pool after closing modal
          useStore.getState().refreshDevicePool();
        }}
      />
    </div>
  );
}
