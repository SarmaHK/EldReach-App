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
  const [roomId, setRoomId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!macAddress.trim()) {
      setError('Please scan or enter a MAC address.');
      return;
    }

    // MAC address validation: XX:XX:XX:XX:XX:XX
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(macAddress.trim())) {
      setError('Invalid MAC address format. Expected XX:XX:XX:XX:XX:XX');
      return;
    }

    if (!connectedGateway?.gatewayId) {
      setError('No gateway connected. Please scan for a gateway first.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('http://localhost:5000/api/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: macAddress.trim(),
          gatewayId: connectedGateway.gatewayId,
          roomId: roomId.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.status === 'success' || res.status === 201) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setMacAddress('');
          setRoomId('');
          onClose();
        }, 1500);
      } else {
        setError(data.message || 'Failed to register node.');
      }
    } catch (err) {
      setError('Could not reach the backend. Is the server running?');
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
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="modal__title">
                {mode === 'manual' ? 'Add Node Manually' : 'Register Sensor Node'}
              </h2>
              <p className="modal__subtitle">
                {mode === 'manual' 
                  ? 'Enter the 12-character MAC address of the sensor node' 
                  : 'Scan the QR code on your sensor to pair it with the gateway'}
              </p>
            </div>
          </div>
          <button className="modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal__body">
          {/* Gateway Banner */}
          <div className="modal__info-box" style={{ background: 'var(--status-active-bg)', color: 'var(--status-active)', border: '1px solid var(--status-active)' }}>
            <Radio size={14} />
            <span>Linking to Gateway: <strong>{connectedGateway?.gatewayId || 'Unknown'}</strong></span>
          </div>

          {/* MAC Address (Simulated QR) */}
          <div className="modal__field">
            <label className="modal__label">
              <QrCode size={14} />
              MAC Address <span className="modal__required">*</span>
            </label>
            <input
              type="text"
              className="modal__input"
              placeholder="e.g. 00:1B:44:11:3A:B7"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
              autoFocus
            />
            <span className="modal__hint">
              {mode === 'manual' ? 'Format: XX:XX:XX:XX:XX:XX' : 'Scan QR code or enter manually'}
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
              ✓ Node registered successfully!
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
              {submitting ? 'Registering...' : 'Register Node'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

