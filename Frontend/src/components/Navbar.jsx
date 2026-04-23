import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, LayoutDashboard, DoorOpen, Wifi, Bell, Settings, Moon, Sun, User } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rooms', label: 'Rooms', icon: DoorOpen },
  { to: '/devices', label: 'Devices', icon: Wifi },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Navbar() {
  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'light';
  });
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      {/* Left: Logo */}
      <div className="navbar__brand" onClick={() => navigate('/')} role="button" tabIndex={0}>
        <div className="navbar__logo-mark">
          <Wifi size={18} />
        </div>
        <span className="navbar__logo-text">
          Eld<span className="navbar__logo-accent">Reach</span>
        </span>
      </div>

      {/* Center: Navigation Links */}
      <div className="navbar__links">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `navbar__link ${isActive ? 'navbar__link--active' : ''}`
            }
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Right: Theme toggle + Avatar */}
      <div className="navbar__actions">
        <button
          className="navbar__icon-btn"
          onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <div className="navbar__avatar">
          <User size={16} />
        </div>
        <span className="navbar__user-label">Admin</span>
      </div>
    </nav>
  );
}
