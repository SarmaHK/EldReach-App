import React from 'react';
import { Bell, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import useStore from '../store/useStore';

/**
 * Alerts page — shows all active and acknowledged alerts.
 */
export default function AlertsPage() {
  const alerts = useStore(s => s.alerts);
  const acknowledgeAlert = useStore(s => s.acknowledgeAlert);

  const active = alerts.filter(a => !a.acknowledged);
  const acknowledged = alerts.filter(a => a.acknowledged);

  return (
    <div className="page-wrapper page-wrapper--alerts">
      <div className="page-header">
        <h1 className="page-header__title">Alerts</h1>
        <p className="page-header__subtitle">
          Fall detections, inactivity warnings, and system events.
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state">
          <Bell size={48} strokeWidth={1} />
          <h3>No Alerts</h3>
          <p>The system is running normally. Alerts will appear here when events are detected.</p>
        </div>
      ) : (
        <>
          {/* Active Alerts */}
          {active.length > 0 && (
            <div className="alerts-section">
              <h2 className="alerts-section__title">
                <AlertTriangle size={18} />
                Active ({active.length})
              </h2>
              <div className="alerts-list">
                {active.map(alert => (
                  <div key={alert.id} className="alert-item alert-item--active card">
                    <div className="alert-item__icon">
                      <AlertTriangle size={18} />
                    </div>
                    <div className="alert-item__content">
                      <span className="alert-item__message">{alert.message}</span>
                      <div className="alert-item__meta">
                        <Clock size={12} />
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                        {alert.deviceId && <span className="alert-item__device">{alert.deviceId}</span>}
                      </div>
                    </div>
                    <button
                      className="alert-item__ack-btn"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <CheckCircle size={16} />
                      Acknowledge
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acknowledged Alerts */}
          {acknowledged.length > 0 && (
            <div className="alerts-section alerts-section--acknowledged">
              <h2 className="alerts-section__title" style={{ color: 'var(--text-tertiary)' }}>
                <CheckCircle size={18} />
                Acknowledged ({acknowledged.length})
              </h2>
              <div className="alerts-list">
                {acknowledged.map(alert => (
                  <div key={alert.id} className="alert-item alert-item--acknowledged card">
                    <div className="alert-item__icon" style={{ color: 'var(--text-tertiary)' }}>
                      <CheckCircle size={18} />
                    </div>
                    <div className="alert-item__content">
                      <span className="alert-item__message" style={{ color: 'var(--text-tertiary)' }}>{alert.message}</span>
                      <div className="alert-item__meta">
                        <Clock size={12} />
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
