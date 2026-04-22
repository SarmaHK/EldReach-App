import React, { useState } from 'react';
import useStore from '../store/useStore';
import { Settings as SettingsIcon, User, Cpu, ShieldCheck, Activity, Smartphone, Wifi, Server, CheckCircle2 } from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('device'); // 'device' | 'account'
  
  const settings = useStore(s => s.settings);
  const updateSettings = useStore(s => s.updateSettings);
  
  const globalGatewayId = useStore(s => s.globalGatewayId);
  const discoveredDevices = useStore(s => s.discoveredDevices);
  const connectedCount = discoveredDevices.filter(d => d.assignedNodeId && d.connectionStatus === 'CONNECTED').length;
  
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSave = () => {
    const newErrors = {};
    
    // Sri Lankan phone number validation (+94xxxxxxxxx or 0xxxxxxxxx)
    if (settings.caregiverPhone && !/^(?:\+94|0)[0-9]{9}$/.test(settings.caregiverPhone.trim().replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid Sri Lankan phone number (e.g., 0712345678 or +94712345678)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleChange = (field, value) => {
    updateSettings({ [field]: value });
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-base)', minHeight: '100%', flex: 1, width: '100%', overflowY: 'auto', color: 'var(--text-primary)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '2rem 1.5rem 3rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ 
            width: 48, height: 48, borderRadius: '12px', background: 'var(--brand-soft)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <SettingsIcon size={24} color="var(--brand)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>System Settings</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Configure device behavior and account preferences.</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
          <button 
            onClick={() => setActiveTab('device')}
            style={{
              ...tabStyle,
              color: activeTab === 'device' ? 'var(--brand)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'device' ? '2px solid var(--brand)' : '2px solid transparent'
            }}
          >
            <Cpu size={16} /> Device Settings
          </button>
          <button 
            onClick={() => setActiveTab('account')}
            style={{
              ...tabStyle,
              color: activeTab === 'account' ? 'var(--brand)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'account' ? '2px solid var(--brand)' : '2px solid transparent'
            }}
          >
            <User size={16} /> Account Settings
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {activeTab === 'device' && (
            <>
              <SectionCard title="System Configuration" icon={<Activity size={18} />}>
                <div style={formRowStyle}>
                  <div style={labelContainerStyle}>
                    <label style={labelStyle}>Activity Sensitivity</label>
                    <span style={descStyle}>Controls how quickly inactivity is detected.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-raised)', padding: '4px', borderRadius: '8px' }}>
                    {['Low', 'Medium', 'High'].map(level => (
                      <button 
                        key={level}
                        onClick={() => handleChange('activitySensitivity', level)}
                        style={{
                          ...segmentedBtnStyle,
                          background: settings.activitySensitivity === level ? 'var(--bg-surface)' : 'transparent',
                          color: settings.activitySensitivity === level ? 'var(--brand)' : 'var(--text-secondary)',
                          boxShadow: settings.activitySensitivity === level ? 'var(--shadow-sm)' : 'none'
                        }}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Backup Wi-Fi Network" icon={<Wifi size={18} />}>
                 <div style={{...descStyle, marginBottom: '1.5rem'}}>
                   Configured network status: 
                   <span style={{ fontWeight: 600, color: settings.backupWifiSSID ? 'var(--status-active)' : 'var(--text-secondary)', marginLeft: '6px' }}>
                     {settings.backupWifiSSID ? 'Connected (Standby)' : 'Not configured'}
                   </span>
                 </div>
                 
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   <div>
                     <label style={{ ...labelStyle, marginBottom: '6px', display: 'block' }}>SSID</label>
                     <input 
                       type="text" 
                       value={settings.backupWifiSSID}
                       onChange={e => handleChange('backupWifiSSID', e.target.value)}
                       placeholder="Network Name"
                       style={inputStyle}
                     />
                   </div>
                   <div>
                     <label style={{ ...labelStyle, marginBottom: '6px', display: 'block' }}>Password</label>
                     <input 
                       type="password" 
                       value={settings.backupWifiPassword}
                       onChange={e => handleChange('backupWifiPassword', e.target.value)}
                       placeholder="••••••••"
                       style={inputStyle}
                     />
                   </div>
                 </div>
              </SectionCard>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <SectionCard title="Gateway Info" icon={<Server size={18} />}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <span style={infoLabelStyle}>Gateway ID</span>
                      <div style={infoValueStyle}>{globalGatewayId}</div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                      <span style={infoLabelStyle}>Status</span>
                      <div style={{ ...infoValueStyle, color: 'var(--status-active)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="status-pulse-green"></span>
                        Connected
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="System Overview" icon={<Cpu size={18} />}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <span style={infoLabelStyle}>Connected Devices</span>
                      <div style={infoValueStyle}>{connectedCount} Active Nodes</div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                      <span style={infoLabelStyle}>System Health</span>
                      <div style={{ ...infoValueStyle, color: 'var(--text-primary)' }}>Operating normally</div>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </>
          )}

          {activeTab === 'account' && (
            <>
              <SectionCard title="User Profile" icon={<User size={18} />}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   <div>
                     <label style={{ ...labelStyle, marginBottom: '6px', display: 'block' }}>Full Name</label>
                     <input 
                       type="text" 
                       value={settings.userName}
                       onChange={e => handleChange('userName', e.target.value)}
                       style={inputStyle}
                     />
                   </div>
                   <div>
                     <label style={{ ...labelStyle, marginBottom: '6px', display: 'block' }}>Email Address</label>
                     <input 
                       type="email" 
                       value={settings.userEmail}
                       readOnly
                       style={{ ...inputStyle, background: 'var(--bg-raised)', color: 'var(--text-secondary)' }}
                     />
                   </div>
                 </div>
              </SectionCard>

              <SectionCard title="Caregiver Contact" icon={<Smartphone size={18} />}>
                 <div style={descStyle}>Alerts will be sent to this number.</div>
                 <div style={{ marginTop: '1rem' }}>
                   <label style={{ ...labelStyle, marginBottom: '6px', display: 'block' }}>Phone Number</label>
                   <input 
                     type="tel" 
                     value={settings.caregiverPhone}
                     onChange={e => handleChange('caregiverPhone', e.target.value)}
                     placeholder="07X XXX XXXX"
                     style={{ ...inputStyle, borderColor: errors.phone ? 'var(--status-alert)' : 'var(--border-soft)' }}
                   />
                   {errors.phone && <span style={{ fontSize: '0.75rem', color: 'var(--status-alert)', marginTop: '6px', display: 'block' }}>{errors.phone}</span>}
                 </div>
              </SectionCard>

              <SectionCard title="Notifications" icon={<ShieldCheck size={18} />}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                     <div style={labelContainerStyle}>
                       <label style={labelStyle}>System Alerts</label>
                       <span style={descStyle}>Receive critical alerts on the dashboard</span>
                     </div>
                     <ToggleSwitch 
                       checked={settings.enableAlerts} 
                       onChange={() => handleChange('enableAlerts', !settings.enableAlerts)} 
                     />
                   </div>

                   <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border-subtle)' }} />

                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                     <div style={labelContainerStyle}>
                       <label style={labelStyle}>SMS Alerts</label>
                       <span style={descStyle}>Forward critical alerts via SMS</span>
                     </div>
                     <ToggleSwitch 
                       checked={settings.enableSmsNotifications} 
                       onChange={() => handleChange('enableSmsNotifications', !settings.enableSmsNotifications)} 
                     />
                   </div>

                 </div>
              </SectionCard>
            </>
          )}

        </div>

        {/* Bottom Action Bar */}
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem',
          marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)'
        }}>
          {saveSuccess && (
            <span style={{ color: 'var(--status-active)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', animation: 'fadeIn 0.3s' }}>
              <CheckCircle2 size={18} /> Saved successfully
            </span>
          )}
          <button 
            onClick={handleSave}
            style={{
              background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: '12px',
              padding: '0.7rem 1.75rem', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer',
              transition: 'background 0.2s, transform 0.1s', boxShadow: 'var(--shadow-sm)'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#4338ca'}
            onMouseOut={e => e.currentTarget.style.background = 'var(--brand)'}
          >
            Save Changes
          </button>
        </div>

      </div>
      
      {/* Required for the pulse animation */}
      <style>{`
        .status-pulse-green {
          width: 8px;
          height: 8px;
          background-color: var(--status-active);
          border-radius: 50%;
          position: relative;
        }
        .status-pulse-green::after {
          content: "";
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border: 2px solid var(--status-active);
          border-radius: 50%;
          animation: pulse 2s infinite ease-out;
        }
        @keyframes pulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// ─── UI Helpers ──────────────────────────────────────────────────────────────

const SectionCard = ({ title, icon, children }) => (
  <div style={{
    background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border-subtle)',
    padding: '1.5rem', overflow: 'hidden',
    boxShadow: 'var(--shadow-sm)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '8px', background: 'var(--brand-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', flexShrink: 0
      }}>{icon}</div>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
    </div>
    {children}
  </div>
);

const ToggleSwitch = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    style={{
      width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
      position: 'relative', transition: 'background 0.3s ease',
      background: checked ? 'var(--brand)' : 'var(--text-tertiary)'
    }}
  >
    <div style={{
      width: '18px', height: '18px', borderRadius: '50%', background: 'var(--bg-surface)',
      position: 'absolute', top: '3px', left: checked ? '23px' : '3px',
      transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: 'var(--shadow-sm)'
    }} />
  </button>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const tabStyle = {
  background: 'transparent', border: 'none', padding: '0.5rem 0.5rem 0.75rem 0.5rem',
  fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
};

const formRowStyle = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem'
};

const labelContainerStyle = {
  display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '400px'
};

const labelStyle = {
  fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)'
};

const descStyle = {
  fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4
};

const segmentedBtnStyle = {
  padding: '0.4rem 1rem', border: 'none', borderRadius: '6px',
  fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', minWidth: '80px'
};

const inputStyle = {
  width: '100%', background: 'var(--bg-surface)', 
  border: '1px solid var(--border-soft)', borderRadius: '10px',
  padding: '0.65rem 0.85rem', color: 'var(--text-primary)', fontSize: '0.9rem',
  outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s'
};

const infoLabelStyle = {
  fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px', display: 'block'
};

const infoValueStyle = {
  fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500
};

export default Settings;
