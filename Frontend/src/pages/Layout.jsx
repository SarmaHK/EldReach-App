import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopHeader from '../components/TopHeader';
import { useBackendSync } from '../hooks/useBackendSync';

const pageTitles = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/rooms': 'Rooms',
  '/devices': 'Devices',
  '/alerts': 'Alerts',
  '/settings': 'Settings',
};

/**
 * Main layout wrapper — dark sidebar + light content area.
 * useBackendSync is called HERE (once) so that every page gets
 * live backend data without needing to call the hook individually.
 */
export default function Layout() {
  useBackendSync();
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || 'EldReach';

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout__main">
        <TopHeader title={pageTitle} />
        <main className="layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
