import React, { useState } from 'react';
import { Wifi, Activity, Radio, Clock, Plus, WifiOff, ArrowRight, RefreshCw, Loader } from 'lucide-react';
import useStore from '../store/useStore';
import ConnectDeviceModal from '../components/ConnectDeviceModal';

/**
 * Devices page — shows connected sensor nodes with three states:
 *   LOADING:  Skeleton/spinner while fetching from backend
 *   ERROR:    Retry prompt if backend is unreachable
 *   EMPTY:    CTA to connect first device
 *   LIST:     Device card grid
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

  const handleRetry = () => {
    useStore.getState().refreshDevicePool();
  };

  return (
    <div className="page-wrapper page-wrapper--devices">
      <div className="page-header">
        <div className="page-header__row">
          <div>
            <h1 className="page-header__title">Devices</h1>
            <p className="page-header__subtitle">
              All connected sensor nodes and their current state.
            </p>
          </div>
          {discoveredDevices.length > 0 && (
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

      /* ── EMPTY STATE ──────────────────────────────────────── */
      ) : discoveredDevices.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-card__icon-ring">
            <div className="empty-state-card__icon">
              <WifiOff size={40} strokeWidth={1.5} />
            </div>
            <div className="empty-state-card__pulse" />
          </div>
          <h2 className="empty-state-card__title">No devices connected</h2>
          <p className="empty-state-card__desc">
            Start monitoring by connecting your first sensor node.
            You can register a device manually or start the hardware simulator.
          </p>
          <div className="empty-state-card__actions">
            <button
              className="empty-state-card__cta"
              onClick={() => setShowModal(true)}
            >
              <Plus size={18} />
              Connect Device
            </button>
            <a
              href="https://github.com/SarmaHK/EldReach-App"
              target="_blank"
              rel="noopener noreferrer"
              className="empty-state-card__link"
            >
              Learn how to set up hardware
              <ArrowRight size={14} />
            </a>
          </div>

          {/* Quick tips */}
          <div className="empty-state-card__tips">
            <div className="empty-state-card__tip">
              <Radio size={16} />
              <div>
                <strong>Using the simulator?</strong>
                <span>Run <code>node simulator.js</code> in the Backend folder.</span>
              </div>
            </div>
            <div className="empty-state-card__tip">
              <Wifi size={16} />
              <div>
                <strong>Real hardware?</strong>
                <span>Connect your ESP32 node via MQTT or API.</span>
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
