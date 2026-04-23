import React, { useState } from 'react';
import { X, Wifi, Radio, DoorOpen, Server } from 'lucide-react';
import useStore from '../store/useStore';

/**
 * Modal dialog for manually connecting/registering a device.
 * Collects nodeId, roomId, and optional gatewayId.
 */
export default function ConnectDeviceModal({ isOpen, onClose }) {
  const logicalRooms = useStore(s => s.logicalRooms);

  const [nodeId, setNodeId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [gatewayId, setGatewayId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!nodeId.trim()) {
      setError('Node ID is required.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('http://localhost:5000/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: nodeId.trim(),
          gatewayId: gatewayId.trim() || undefined,
          roomId: roomId.trim() || undefined,
          sensors: {
            radar: { targets: [] },
            presence: { motionDetected: false, breathingDetected: false },
          },
        }),
      });

      const data = await res.json();

      if (data.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setNodeId('');
          setRoomId('');
          setGatewayId('');
          onClose();
        }, 1500);
      } else {
        setError(data.message || 'Failed to register device.');
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
              <Wifi size={20} />
            </div>
            <div>
              <h2 className="modal__title">Connect Device</h2>
              <p className="modal__subtitle">Register a new sensor node to the system</p>
            </div>
          </div>
          <button className="modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal__body">
          {/* Node ID */}
          <div className="modal__field">
            <label className="modal__label">
              <Radio size={14} />
              Node ID <span className="modal__required">*</span>
            </label>
            <input
              type="text"
              className="modal__input"
              placeholder="e.g. node_1"
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              autoFocus
            />
            <span className="modal__hint">Unique identifier for this sensor node</span>
          </div>

          {/* Room Selection */}
          <div className="modal__field">
            <label className="modal__label">
              <DoorOpen size={14} />
              Room
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

          {/* Gateway ID */}
          <div className="modal__field">
            <label className="modal__label">
              <Server size={14} />
              Gateway ID <span className="modal__optional">(optional)</span>
            </label>
            <input
              type="text"
              className="modal__input"
              placeholder="e.g. 192.168.1.10"
              value={gatewayId}
              onChange={(e) => setGatewayId(e.target.value)}
            />
            <span className="modal__hint">IP address or ID of the parent gateway</span>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="modal__alert modal__alert--error">
              {error}
            </div>
          )}
          {success && (
            <div className="modal__alert modal__alert--success">
              ✓ Device registered successfully!
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
              {submitting ? 'Registering...' : 'Register Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
