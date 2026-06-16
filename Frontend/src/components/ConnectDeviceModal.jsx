import React, { useState } from 'react';
import { X, QrCode, DoorOpen, Radio } from 'lucide-react';
import useStore from '../store/useStore';

/**
 * Modal dialog for registering a sensor node via QR/Barcode scan.
 * Gateway connection is automatic and required.
 */
export default function ConnectDeviceModal({ isOpen, mode, onClose }) {
  const logicalRooms = useStore(s => s.logicalRooms);
  const connectedGateway = useStore(s => s.connectedGateway);

  const [macAddress, setMacAddress] = useState('');
  const [customName, setCustomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [scanning, setScanning] = useState(mode === 'scan');
  const [scanComplete, setScanComplete] = useState(false);

  React.useEffect(() => {
    if (mode === 'scan' && isOpen) {
      setScanning(true);
      setScanComplete(false);
      // Simulate scanning duration
      const timer = setTimeout(() => {
        setScanning(false);
        setScanComplete(true);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setScanning(false);
      setScanComplete(false);
    }
  }, [mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!macAddress.trim()) {
      setError('Please find and enter a device code.');
      return;
    }

    // MAC address validation: XX:XX:XX:XX:XX:XX
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(macAddress.trim())) {
      setError('Invalid device code format. Expected 12 characters (e.g. 00:1B:44:11:3A:B7)');
      return;
    }

    if (!connectedGateway?.gatewayId) {
      setError('No home hub connected. Please find your home hub first.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Step 1: Register the device
      const regRes = await fetch('http://localhost:5000/api/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: macAddress.trim(),
          gatewayId: connectedGateway.gatewayId,
          roomId: roomId.trim() || undefined,
          customName: customName.trim() || undefined,
        }),
      });

      const regData = await regRes.json();

      if (regData.status !== 'success' && regRes.status !== 201) {
        setError(regData.message || 'Failed to register device.');
        setSubmitting(false);
        return;
      }

      // Step 2: Trigger sensor verification
      const verifyRes = await fetch('http://localhost:5000/api/devices/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          macAddress: macAddress.trim(),
          gatewayId: connectedGateway.gatewayId,
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.status === 'success') {
        if (verifyData.verified) {
          setSuccess(true);
        } else {
          setError('Device registered, but verification failed (Not Active).');
        }
      } else {
        setError(verifyData.message || 'Device registered, but verification error occurred.');
      }

      if (verifyData.status === 'success' && verifyData.verified) {
        setTimeout(() => {
          setSuccess(false);
          setMacAddress('');
          setCustomName('');
          setRoomId('');
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        {/* Header */}
        <div className="modal__header">
          <div className="modal__header-left">
            <div className="modal__icon">
              {scanning ? <Radio className="spin-animation" size={20} /> : <QrCode size={20} />}
            </div>
            <div>
              <h2 className="modal__title">
                {scanning ? 'Scanning for Devices...' : (mode === 'manual' ? 'Add Device Manually' : 'Add Device')}
              </h2>
              <p className="modal__subtitle">
                {scanning ? 'Looking for nearby active devices' : (mode === 'manual' 
                  ? 'Enter the 12-character device code' 
                  : 'Find the device code on your device or QR label')}
              </p>
            </div>
          </div>
          <button className="modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form or Scanning State */}
        <div className="modal__body">
          {scanning ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div className="empty-state-card__icon-ring" style={{ margin: '0 auto 1.5rem', width: '80px', height: '80px' }}>
                <div className="empty-state-card__icon gateway-scan-icon">
                  <Radio size={40} strokeWidth={1.5} className="scan-pulse" />
                </div>
                <div className="empty-state-card__pulse" />
              </div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Searching...</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Please ensure your device is powered on and near the Home Hub.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Gateway Banner */}
              <div className="modal__info-box" style={{ background: 'var(--status-active-bg)', color: 'var(--status-active)', border: '1px solid var(--status-active)' }}>
                <Radio size={14} />
                <span>Linking to Home Hub: <strong>{connectedGateway?.gatewayId || 'Unknown'}</strong></span>
              </div>

              {scanComplete && (
                <div className="modal__alert modal__alert--error" style={{ marginBottom: '1rem' }}>
                  No devices automatically found. Please enter the code manually.
                </div>
              )}

              {/* MAC Address (Simulated QR) */}
              <div className="modal__field">
                <label className="modal__label">
                  <QrCode size={14} />
                  Device Code <span className="modal__required">*</span>
                </label>
                <input
                  type="text"
                  className="modal__input"
                  placeholder="e.g. 00:1B:44:11:3A:B7"
                  value={macAddress}
                  onChange={(e) => setMacAddress(e.target.value)}
                  autoFocus={!scanComplete}
                />
                <span className="modal__hint">
                  {mode === 'manual' ? 'Format: 12-character code (XX:XX:XX:XX:XX:XX)' : 'Find the device code on your device'}
                </span>
              </div>

              {/* Custom Name */}
              <div className="modal__field">
                <label className="modal__label">
                  <DoorOpen size={14} />
                  Room Name <span className="modal__optional">(optional)</span>
                </label>
                <input
                  type="text"
                  className="modal__input"
                  placeholder="e.g. Kitchen, Living Room"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <span className="modal__hint">
                  Assign a friendly name to this device
                </span>
              </div>

              {/* Room Selection */}
              <div className="modal__field">
                <label className="modal__label">
                  <DoorOpen size={14} />
                  Room <span className="modal__optional">(optional)</span>
                </label>
                {logicalRooms.length > 0 ? (
                  <select
                    className="modal__input modal__select"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                  >
                    <option value="">— Select a room —</option>
                    {logicalRooms.map(room => (
                      <option key={room.id} value={room.id}>
                        {room.name || room.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="modal__info-box">
                    <DoorOpen size={14} />
                    <span>No rooms configured yet. Create rooms in the Room Architect first.</span>
                  </div>
                )}
              </div>

              {/* Error / Success */}
              {error && (
                <div className="modal__alert modal__alert--error">
                  {error}
                </div>
              )}
              {success && (
                <div className="modal__alert modal__alert--success">
                  ✓ Device added successfully!
                </div>
              )}

              {/* Actions */}
              <div className="modal__actions">
                <button type="button" className="modal__btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal__btn-primary"
                  disabled={submitting || success}
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

