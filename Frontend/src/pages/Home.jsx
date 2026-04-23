import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, DoorOpen, Wifi, Bell,
  ArrowRight, Activity, Shield, Eye, Radio
} from 'lucide-react';
import FeatureCard from '../components/FeatureCard';
import useStore from '../store/useStore';
import heroImg from '../assets/hero-illustration.png';

const features = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Monitor all connected sensors, gateways, and room activity in real-time with live graphs and topology views.',
    buttonText: 'Open Dashboard',
    to: '/dashboard',
    color: '#4F46E5',
  },
  {
    icon: DoorOpen,
    title: 'Rooms',
    description: 'Design and manage room layouts with the interactive architect. Assign sensors and define spatial boundaries.',
    buttonText: 'View Rooms',
    to: '/rooms',
    color: '#14B8A6',
  },
  {
    icon: Wifi,
    title: 'Devices',
    description: 'Track connected sensor nodes, monitor their status, radar data, and presence detection outputs.',
    buttonText: 'Manage Devices',
    to: '/devices',
    color: '#F59E0B',
  },
  {
    icon: Bell,
    title: 'Alerts',
    description: 'View fall detections, inactivity warnings, and system alerts. Stay informed with real-time notifications.',
    buttonText: 'View Alerts',
    to: '/alerts',
    color: '#EF4444',
  },
];

export default function Home() {
  const navigate = useNavigate();

  // Pull live stats from store
  const discoveredDevices = useStore(s => s.discoveredDevices);
  const alerts = useStore(s => s.alerts);
  const logicalRooms = useStore(s => s.logicalRooms);

  const totalDevices = discoveredDevices?.length || 0;
  const activeDevices = discoveredDevices?.filter(d => d.connectionStatus === 'CONNECTED').length || 0;
  const totalRooms = logicalRooms?.length || 0;
  const alertCount = alerts?.filter(a => !a.acknowledged).length || 0;

  const stats = [
    { label: 'Total Rooms', value: totalRooms, icon: DoorOpen, color: '#14B8A6' },
    { label: 'Total Devices', value: totalDevices, icon: Wifi, color: '#4F46E5' },
    { label: 'Active Devices', value: activeDevices, icon: Activity, color: '#22C55E' },
    { label: 'Active Alerts', value: alertCount, icon: Bell, color: '#EF4444' },
  ];

  // Animated counter effect
  const [counters, setCounters] = useState(stats.map(() => 0));
  useEffect(() => {
    const targets = [totalRooms, totalDevices, activeDevices, alertCount];
    const duration = 1200;
    const steps = 30;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      setCounters(targets.map(t => Math.round((t * step) / steps)));
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [totalRooms, totalDevices, activeDevices, alertCount]);

  return (
    <div className="home">
      {/* ── Hero Section ──────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero__container">
          <div className="hero__content">
            <div className="hero__badge">
              <Radio size={14} />
              <span>Real-Time IoT Platform</span>
            </div>
            <h1 className="hero__title">
              Smart Monitoring.
              <br />
              <span className="hero__title-accent">Safer Lives.</span>
            </h1>
            <p className="hero__description">
              EldReach is a production-oriented IoT monitoring system that tracks human activity
              using radar-based sensor nodes. Real-time data processing, event detection, and
              live dashboards — all in one place.
            </p>
            <div className="hero__actions">
              <button className="hero__cta-primary" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
                <ArrowRight size={18} />
              </button>
              <button className="hero__cta-secondary" onClick={() => navigate('/rooms')}>
                View Rooms
              </button>
            </div>
            <div className="hero__trust">
              <div className="hero__trust-item">
                <Shield size={14} />
                <span>Fall Detection</span>
              </div>
              <div className="hero__trust-item">
                <Eye size={14} />
                <span>Presence Sensing</span>
              </div>
              <div className="hero__trust-item">
                <Activity size={14} />
                <span>Real-time Tracking</span>
              </div>
            </div>
          </div>
          <div className="hero__visual">
            <div className="hero__image-wrapper">
              <img src={heroImg} alt="EldReach IoT System" className="hero__image" />
              <div className="hero__image-glow" />
            </div>
          </div>
        </div>
      </section>

      {/* ── System Status Bar ─────────────────────────────────────── */}
      <section className="status-bar">
        <div className="status-bar__inner">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="status-card">
                <div className="status-card__icon" style={{ color: stat.color, backgroundColor: `${stat.color}15` }}>
                  <Icon size={20} />
                </div>
                <div className="status-card__info">
                  <span className="status-card__value">{counters[i]}</span>
                  <span className="status-card__label">{stat.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Feature Cards ─────────────────────────────────────────── */}
      <section className="features">
        <div className="features__header">
          <h2 className="features__title">System Modules</h2>
          <p className="features__subtitle">
            Navigate to the core sections of the EldReach platform
          </p>
        </div>
        <div className="features__grid">
          {features.map(f => (
            <FeatureCard key={f.to} {...f} />
          ))}
        </div>
      </section>
    </div>
  );
}
