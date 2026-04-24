import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DoorOpen, Wifi, Bell, Activity, AlertTriangle,
  Clock, Radio, CheckCircle, ArrowRight, Loader
} from 'lucide-react';
import useStore from '../store/useStore';

export default function Home() {
  const navigate = useNavigate();
  const discoveredDevices = useStore(s => s.discoveredDevices);
  const alerts = useStore(s => s.alerts);
  const logicalRooms = useStore(s => s.logicalRooms);
  const devicesLoading = useStore(s => s.devicesLoading);
  const devicesError = useStore(s => s.devicesError);
  const backendSynced = useStore(s => s.backendSynced);

  const totalDevices = discoveredDevices?.length || 0;
  const activeDevices = discoveredDevices?.filter(d => d.connectionStatus === 'CONNECTED').length || 0;
  const totalRooms = logicalRooms?.length || 0;
  const alertCount = alerts?.filter(a => !a.acknowledged).length || 0;

  const stats = [
    { label: 'Total Rooms', value: totalRooms, icon: DoorOpen, color: '#14B8A6', bg: '#F0FDFA' },
    { label: 'Total Devices', value: totalDevices, icon: Wifi, color: '#FF6A00', bg: '#FFF4ED' },
    { label: 'Active Devices', value: activeDevices, icon: Activity, color: '#22C55E', bg: '#DCFCE7' },
    { label: 'Active Alerts', value: alertCount, icon: Bell, color: '#EF4444', bg: '#FEE2E2' },
  ];

  // Animated counter
  const [counters, setCounters] = useState(stats.map(() => 0));
  useEffect(() => {
    const targets = [totalRooms, totalDevices, activeDevices, alertCount];
    const steps = 30;
    const interval = 1200 / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setCounters(targets.map(t => Math.round((t * step) / steps)));
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [totalRooms, totalDevices, activeDevices, alertCount]);

  const recentAlerts = alerts.filter(a => !a.acknowledged).slice(0, 5);
  const recentDevices = discoveredDevices.slice(0, 5);

  return (
    <div className="dashboard">
      {/* ── Loading State ── */}
      {(devicesLoading && !backendSynced) ? (
        <div className="empty-state-card">
          <div className="empty-state-card__icon-ring">
            <div className="empty-state-card__icon">
              <Loader size={36} strokeWidth={1.5} className="spin-animation" />
            </div>
          </div>
          <h2 className="empty-state-card__title">Loading dashboard…</h2>
          <p className="empty-state-card__desc">
            Connecting to backend and fetching system data.
          </p>
        </div>
      ) : devicesError ? (
        <div className="empty-state-card">
          <div className="empty-state-card__icon-ring">
            <div className="empty-state-card__icon" style={{ color: 'var(--status-alert)' }}>
              <AlertTriangle size={40} strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="empty-state-card__title">Unable to load data</h2>
          <p className="empty-state-card__desc">{devicesError}</p>
          <div className="empty-state-card__actions">
            <button className="empty-state-card__cta" onClick={() => useStore.getState().refreshDevicePool()}>
              Retry
            </button>
          </div>
        </div>
      ) : (
      <>
      {/* ── Stat Cards ── */}
      <div className="dashboard__stats">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="stat-card__icon" style={{ color: stat.color, backgroundColor: stat.bg }}>
                <Icon size={22} />
              </div>
              <div className="stat-card__info">
                <span className="stat-card__value">{counters[i]}</span>
                <span className="stat-card__label">{stat.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Content Grid ── */}
      <div className="dashboard__grid">
        {/* Recent Alerts */}
        <div className="dashboard__card">
          <div className="dashboard__card-header">
            <h3 className="dashboard__card-title">
              <AlertTriangle size={16} style={{ color: 'var(--status-alert)' }} />
              Recent Alerts
            </h3>
            <button className="dashboard__card-link" onClick={() => navigate('/alerts')}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="dashboard__card-body">
            {recentAlerts.length === 0 ? (
              <div className="dashboard__empty">
                <CheckCircle size={20} style={{ color: 'var(--status-active)' }} />
                <span>No active alerts — system running normally.</span>
              </div>
            ) : (
              <div className="dashboard__alert-list">
                {recentAlerts.map(alert => (
                  <div key={alert.id} className="dashboard__alert-item">
                    <div className="dashboard__alert-dot" />
                    <div className="dashboard__alert-info">
                      <span className="dashboard__alert-msg">{alert.message}</span>
                      <span className="dashboard__alert-time">
                        <Clock size={11} />
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Device Status */}
        <div className="dashboard__card">
          <div className="dashboard__card-header">
            <h3 className="dashboard__card-title">
              <Wifi size={16} style={{ color: 'var(--brand)' }} />
              Device Status
            </h3>
            <button className="dashboard__card-link" onClick={() => navigate('/devices')}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="dashboard__card-body">
            {recentDevices.length === 0 ? (
              <div className="dashboard__empty">
                <Radio size={20} style={{ color: 'var(--text-tertiary)' }} />
                <span>No devices connected yet.</span>
              </div>
            ) : (
              <div className="dashboard__device-list">
                {recentDevices.map(device => (
                  <div key={device._id || device.deviceId} className="dashboard__device-item">
                    <div className="dashboard__device-status" style={{
                      background: device.connectionStatus === 'CONNECTED' ? 'var(--status-active)' : 'var(--status-offline)'
                    }} />
                    <span className="dashboard__device-id">{device.deviceId}</span>
                    <span className="dashboard__device-badge" style={{
                      color: device.connectionStatus === 'CONNECTED' ? 'var(--status-active)' : 'var(--status-offline)',
                      background: device.connectionStatus === 'CONNECTED' ? 'var(--status-active-bg)' : 'var(--status-offline-bg)',
                    }}>
                      {device.connectionStatus === 'CONNECTED' ? 'Active' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Room Status */}
        <div className="dashboard__card">
          <div className="dashboard__card-header">
            <h3 className="dashboard__card-title">
              <DoorOpen size={16} style={{ color: '#14B8A6' }} />
              Room Status
            </h3>
            <button className="dashboard__card-link" onClick={() => navigate('/rooms')}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="dashboard__card-body">
            {logicalRooms.length === 0 ? (
              <div className="dashboard__empty">
                <DoorOpen size={20} style={{ color: 'var(--text-tertiary)' }} />
                <span>No rooms configured. Create rooms in Room Architect.</span>
              </div>
            ) : (
              <div className="dashboard__room-list">
                {logicalRooms.map(room => (
                  <div key={room.id} className="dashboard__room-item">
                    <DoorOpen size={16} style={{ color: '#14B8A6' }} />
                    <span className="dashboard__room-name">{room.name || room.id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard__card">
          <div className="dashboard__card-header">
            <h3 className="dashboard__card-title">
              <Activity size={16} style={{ color: 'var(--brand)' }} />
              Quick Actions
            </h3>
          </div>
          <div className="dashboard__card-body">
            <div className="dashboard__actions">
              <button className="dashboard__action-btn" onClick={() => navigate('/rooms')}>
                <DoorOpen size={18} />
                <span>Room Architect</span>
              </button>
              <button className="dashboard__action-btn" onClick={() => navigate('/devices')}>
                <Wifi size={18} />
                <span>Manage Devices</span>
              </button>
              <button className="dashboard__action-btn" onClick={() => navigate('/settings')}>
                <Activity size={18} />
                <span>System Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
