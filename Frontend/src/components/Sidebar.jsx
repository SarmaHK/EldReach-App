import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, DoorOpen, Wifi, Bell, Settings, Radio, User } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rooms', label: 'Rooms', icon: DoorOpen },
  { to: '/devices', label: 'Devices', icon: Wifi },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Dark vertical sidebar with orange active highlight.
 * Fixed on the left side of the viewport.
 */
export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <nav className="sidebar-nav">
      {/* Logo */}
      <div className="sidebar-nav__brand" onClick={() => navigate('/')} role="button" tabIndex={0}>
        <div className="sidebar-nav__logo-mark">
          <Radio size={20} />
        </div>
        <span className="sidebar-nav__logo-text">
          Eld<span className="sidebar-nav__logo-accent">Reach</span>
        </span>
      </div>

      {/* Menu Items */}
      <div className="sidebar-nav__menu">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-nav__link ${isActive ? 'sidebar-nav__link--active' : ''}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      {/* User Footer */}
      <div className="sidebar-nav__footer">
        <div className="sidebar-nav__user">
          <div className="sidebar-nav__avatar">
            <User size={16} />
          </div>
          <div className="sidebar-nav__user-info">
            <span className="sidebar-nav__user-name">Admin</span>
            <span className="sidebar-nav__user-role">System Manager</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
