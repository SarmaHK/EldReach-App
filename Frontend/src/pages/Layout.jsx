import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useBackendSync } from '../hooks/useBackendSync';

/**
 * Main layout wrapper. Renders Navbar + page content + Footer.
 * The <Outlet /> is where route-specific pages render.
 *
 * useBackendSync is called HERE (once) so that every page gets
 * live backend data without needing to call the hook individually.
 */
export default function Layout() {
  useBackendSync();

  return (
    <div className="layout">
      <Navbar />
      <main className="layout__content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
