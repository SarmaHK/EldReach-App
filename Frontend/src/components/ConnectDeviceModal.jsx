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

    try {
      const res = await fetch('http://localhost:5000/api/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: macAddress.trim(),
          gatewayId: connectedGateway.gatewayId,
          roomId: roomId.trim() || undefined,
          customName: customName.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.status === 'success' || res.status === 201) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setMacAddress('');
          setCustomName('');
          setRoomId('');
          onClose();
        }, 1500);
      } else {
        setError(data.message || 'Something went wrong. Please try again.');
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
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="modal__title">
                {mode === 'manual' ? 'Add Device Manually' : 'Add Device'}
              </h2>
              <p className="modal__subtitle">
                {mode === 'manual' 
                  ? 'Enter the 12-character device code' 
                  : 'Find the device code on your device or QR label'}
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
            <span>Linking to Home Hub: <strong>{connectedGateway?.gatewayId || 'Unknown'}</strong></span>
          </div>

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
              autoFocus
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
      </div>
    </div>
  );
}

