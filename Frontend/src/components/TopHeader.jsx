import React, { useState, useEffect } from 'react';
import { Moon, Sun, Bell } from 'lucide-react';
import useStore from '../store/useStore';

/**
 * Top header bar — sits above the content area (right of sidebar).
 * Shows page title, alert count badge, and theme toggle.
 */
export default function TopHeader({ title }) {
  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'light';
  });

  const alerts = useStore(s => s.alerts);
  const activeAlertCount = alerts.filter(a => !a.acknowledged).length;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <header className="top-header">
      <div className="top-header__left">
        <h1 className="top-header__page-title">{title}</h1>
      </div>

      <div className="top-header__actions">
        {/* Alert indicator */}
        <button className="top-header__icon-btn" style={{ position: 'relative' }}>
          <Bell size={18} />
          {activeAlertCount > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              width: '18px', height: '18px', borderRadius: '50%',
              background: 'var(--status-alert)', color: '#fff',
              fontSize: '0.65rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {activeAlertCount > 9 ? '9+' : activeAlertCount}
            </span>
          )}
        </button>

        {/* Theme toggle */}
        <button
          className="top-header__icon-btn"
          onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </header>
  );
}
