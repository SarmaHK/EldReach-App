import React, { useState } from 'react';
import { X, Search, Wifi, CheckCircle2, AlertTriangle, Loader } from 'lucide-react';
import useStore from '../store/useStore';

export default function ConnectGatewayModal({ isOpen, onClose }) {
  const [macAddress, setMacAddress] = useState('');
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const registerGateway = useStore(s => s.registerGatewayManual);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!macAddress.trim()) throw new Error('MAC Address is required');
      
      const res = await registerGateway(macAddress.trim(), customName.trim() || undefined);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setMacAddress('');
          setCustomName('');
          onClose();
        }, 2000);
      } else {
        setError(res.error || 'Failed to register Home Hub');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={overlayStyle}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Add Home Hub Manually
          </h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        {success ? (
          <div style={successContainerStyle}>
            <CheckCircle2 size={48} color="var(--status-active)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>Hub Registered!</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center' }}>
              Your Home Hub has been added. Power it on to bring it online.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Enter the MAC address of your EldReach Home Hub to add it to your system.
            </p>

            {error && (
              <div style={errorBannerStyle}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={formGroupStyle}>
              <label style={labelStyle}>MAC Address / Hub ID *</label>
              <input
                type="text"
                value={macAddress}
                onChange={e => setMacAddress(e.target.value)}
                placeholder="e.g. AA:BB:CC:DD:EE:FF or GW001"
                style={inputStyle}
                disabled={loading}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Custom Name (Optional)</label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. Living Room Hub"
                style={inputStyle}
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button type="button" onClick={onClose} style={secondaryBtnStyle} disabled={loading}>
                Cancel
              </button>
              <button type="submit" style={primaryBtnStyle} disabled={loading || !macAddress.trim()}>
                {loading ? <Loader size={16} className="spin-animation" /> : 'Register Hub'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Inline Styles
const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 1000,
  background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};
const modalStyle = {
  background: 'var(--bg-surface)', borderRadius: '16px', padding: '2rem',
  width: '100%', maxWidth: '440px', border: '1px solid var(--border-subtle)',
  boxShadow: 'var(--shadow-xl)', position: 'relative'
};
const closeBtnStyle = {
  background: 'transparent', border: 'none', color: 'var(--text-tertiary)',
  cursor: 'pointer', padding: '4px', display: 'flex'
};
const formGroupStyle = { marginBottom: '1.25rem' };
const labelStyle = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600,
  color: 'var(--text-secondary)', marginBottom: '0.5rem'
};
const inputStyle = {
  width: '100%', padding: '0.75rem 1rem', borderRadius: '10px',
  border: '1px solid var(--border-soft)', background: 'var(--bg-base)',
  color: 'var(--text-primary)', fontSize: '0.95rem', boxSizing: 'border-box'
};
const primaryBtnStyle = {
  flex: 1, padding: '0.8rem', borderRadius: '10px', border: 'none',
  background: 'var(--brand)', color: '#fff', fontWeight: 600, fontSize: '0.95rem',
  cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center'
};
const secondaryBtnStyle = {
  flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border-subtle)',
  background: 'transparent', color: 'var(--text-primary)', fontWeight: 600,
  fontSize: '0.95rem', cursor: 'pointer'
};
const errorBannerStyle = {
  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem',
  background: 'var(--status-alert-bg)', color: 'var(--status-alert)',
  borderRadius: '8px', border: '1px solid var(--status-alert)',
  fontSize: '0.85rem', fontWeight: 500, marginBottom: '1.25rem'
};
const successContainerStyle = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '2rem 0', animation: 'fadeIn 0.3s ease-out'
};
